'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#58a6ff', '#f85149', '#d29922', '#bc8cff', '#3fb950', '#39c5cf'];
const PIECE_COUNT = 90;
const LIFETIME_MS = 3200;

export function Confetti({ active, onDone }: { active: boolean; onDone: () => void }) {
  const [pieces] = useState(() =>
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2.2 + Math.random() * 1.2,
      color: COLORS[i % COLORS.length],
      rotate: (Math.random() - 0.5) * 720,
      drift: (Math.random() - 0.5) * 240,
      width: 6 + Math.random() * 6
    }))
  );

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(onDone, LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [active, onDone]);

  if (!active) return null;

  return (
    <div className="confetti-overlay" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              backgroundColor: p.color,
              width: `${p.width}px`,
              height: `${p.width * 0.4}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--confetti-drift': `${p.drift}px`,
              '--confetti-rotate': `${p.rotate}deg`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
