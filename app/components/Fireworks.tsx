'use client';

import { useState } from 'react';

const COLORS = ['#58a6ff', '#f85149', '#d29922', '#bc8cff', '#3fb950', '#39c5cf', '#ffffff'];
const BURST_COUNT = 6;
const PARTICLES_PER_BURST = 26;

export function Fireworks({ active }: { active: boolean }) {
  const [bursts] = useState(() =>
    Array.from({ length: BURST_COUNT }, (_, i) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        id: i,
        x: 12 + Math.random() * 76,
        y: 12 + Math.random() * 45,
        delay: i * 0.45 + Math.random() * 0.25,
        particles: Array.from({ length: PARTICLES_PER_BURST }, (_, j) => {
          const angle = (j / PARTICLES_PER_BURST) * 360 + Math.random() * 8;
          const distance = 55 + Math.random() * 65;
          const rad = (angle * Math.PI) / 180;
          return {
            id: j,
            dx: Math.cos(rad) * distance,
            dy: Math.sin(rad) * distance,
            color
          };
        })
      };
    })
  );

  if (!active) return null;

  return (
    <div className="fireworks-overlay" aria-hidden="true">
      {bursts.map(burst => (
        <div key={burst.id} className="firework-burst" style={{ left: `${burst.x}%`, top: `${burst.y}%` }}>
          {burst.particles.map(p => (
            <span
              key={p.id}
              className="firework-particle"
              style={
                {
                  backgroundColor: p.color,
                  color: p.color,
                  animationDelay: `${burst.delay}s`,
                  '--fw-dx': `${p.dx}px`,
                  '--fw-dy': `${p.dy}px`
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
