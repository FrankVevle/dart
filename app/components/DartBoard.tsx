'use client';

import { useId } from 'react';
import type { DartThrow } from '@/lib/DartsMatchEngine';

const AVATAR_MARKER_RADIUS = 9;

// Standard dartboard wedge order, clockwise from the top.
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_BULLSEYE = 12;
const R_BULL = 30;
const R_TRIPLE_IN = 95;
const R_TRIPLE_OUT = 115;
const R_DOUBLE_IN = 150;
const R_DOUBLE_OUT = 160;
const R_LABEL = 172;

// Deterministic pseudo-random in [0,1) so a given throw's dot stays put across re-renders.
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function polar(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function wedgePath(innerR: number, outerR: number, startDeg: number, endDeg: number): string {
  const p1 = polar(outerR, startDeg);
  const p2 = polar(outerR, endDeg);
  const p3 = polar(innerR, endDeg);
  const p4 = polar(innerR, startDeg);
  return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 0 0 ${p4.x} ${p4.y} Z`;
}

// We only know which wedge and ring a dart landed in, not the exact spot within it —
// so we scatter each dot deterministically within its true band for a natural look.
function throwPosition(t: DartThrow, index: number) {
  if (t.segment === 25) {
    const r =
      t.multiplier === 2 ? seeded(index * 3.1) * R_BULLSEYE : R_BULL - seeded(index * 5.7) * (R_BULL - R_BULLSEYE);
    const angle = seeded(index * 9.3) * 360;
    return polar(r, angle);
  }

  const idx = ORDER.indexOf(t.segment);
  const center = idx * 18;
  const angle = center + (seeded(index * 4.2) - 0.5) * 16;

  let r: number;
  if (t.multiplier === 3) {
    r = R_TRIPLE_IN + seeded(index * 6.6) * (R_TRIPLE_OUT - R_TRIPLE_IN);
  } else if (t.multiplier === 2) {
    r = R_DOUBLE_IN + seeded(index * 7.8) * (R_DOUBLE_OUT - R_DOUBLE_IN);
  } else {
    const useOuterBand = seeded(index * 2.5) > 0.4;
    r = useOuterBand
      ? R_TRIPLE_OUT + seeded(index * 8.1) * (R_DOUBLE_IN - R_TRIPLE_OUT)
      : R_BULL + seeded(index * 8.1) * (R_TRIPLE_IN - R_BULL);
  }
  return polar(r, angle);
}

export function DartBoard({
  throws,
  dotColor = '#e0483e',
  avatarUrl
}: {
  throws: DartThrow[];
  dotColor?: string;
  avatarUrl?: string;
}) {
  const clipId = `dart-avatar-clip-${useId()}`;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" role="img" aria-label="Dartskive">
      {avatarUrl && (
        <defs>
          <clipPath id={clipId}>
            <circle cx={0} cy={0} r={AVATAR_MARKER_RADIUS} />
          </clipPath>
        </defs>
      )}
      <circle cx={CX} cy={CY} r={R_DOUBLE_OUT + 2} fill="#111820" />
      {ORDER.map((num, i) => {
        const start = i * 18 - 9;
        const end = i * 18 + 9;
        const isDark = i % 2 === 0;
        const singleFill = isDark ? '#1c1f26' : '#ded2b8';
        const bandFill = isDark ? '#c23b32' : '#2f7d4f';
        return (
          <g key={num}>
            <path d={wedgePath(R_DOUBLE_IN, R_DOUBLE_OUT, start, end)} fill={bandFill} stroke="#0d0d0d" strokeWidth={0.5} />
            <path d={wedgePath(R_TRIPLE_OUT, R_DOUBLE_IN, start, end)} fill={singleFill} stroke="#0d0d0d" strokeWidth={0.5} />
            <path d={wedgePath(R_TRIPLE_IN, R_TRIPLE_OUT, start, end)} fill={bandFill} stroke="#0d0d0d" strokeWidth={0.5} />
            <path d={wedgePath(R_BULL, R_TRIPLE_IN, start, end)} fill={singleFill} stroke="#0d0d0d" strokeWidth={0.5} />
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={R_BULL} fill="#2f7d4f" stroke="#0d0d0d" strokeWidth={0.5} />
      <circle cx={CX} cy={CY} r={R_BULLSEYE} fill="#c23b32" stroke="#0d0d0d" strokeWidth={0.5} />
      {ORDER.map((num, i) => {
        const pos = polar(R_LABEL, i * 18);
        return (
          <text key={num} x={pos.x} y={pos.y} fill="#8b949e" fontSize={11} textAnchor="middle" dominantBaseline="middle">
            {num}
          </text>
        );
      })}
      {throws.map((t, i) => {
        const pos = throwPosition(t, i);
        if (avatarUrl) {
          return (
            <g key={i} transform={`translate(${pos.x} ${pos.y})`}>
              <circle r={AVATAR_MARKER_RADIUS + 1} fill="white" />
              <image
                href={avatarUrl}
                x={-AVATAR_MARKER_RADIUS}
                y={-AVATAR_MARKER_RADIUS}
                width={AVATAR_MARKER_RADIUS * 2}
                height={AVATAR_MARKER_RADIUS * 2}
                clipPath={`url(#${clipId})`}
                preserveAspectRatio="xMidYMid slice"
              />
            </g>
          );
        }
        return <circle key={i} cx={pos.x} cy={pos.y} r={4.5} fill={dotColor} stroke="white" strokeWidth={0.75} opacity={0.9} />;
      })}
    </svg>
  );
}
