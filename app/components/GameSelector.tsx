'use client';

import { useEffect, useState } from 'react';

export type GameType = 'x01' | 'x01-duo' | 'clock' | 'cricket' | 'halveit' | 'highlow' | 'killer';

const GAMES: Array<{ id: GameType; title: string; description: string; available: boolean }> = [
  {
    id: 'x01',
    title: '301 / 501',
    description: 'Klassisk nedtelling til null, med valgfri double-out.',
    available: true
  },
  {
    id: 'x01-duo',
    title: '301 / 501 Duo',
    description: 'Som vanlig, men havner du på nøyaktig samme poengsum som en motstander, sendes de tilbake til start.',
    available: true
  },
  {
    id: 'clock',
    title: 'Rundt klokka',
    description: 'Treff 1 til 20 i rekkefølge. Bom avslutter turen med én gang. Først til 20 vinner.',
    available: true
  },
  {
    id: 'cricket',
    title: 'Cricket',
    description: 'Lukk 15–20 og bull med 3 treff hver, score på åpne tall motstanderen ikke har lukket.',
    available: true
  },
  {
    id: 'halveit',
    title: 'Halve-it',
    description: 'Hver runde har et fast mål. Bommer du helt på det, halveres hele poengsummen din.',
    available: true
  },
  {
    id: 'highlow',
    title: 'High-Low',
    description: 'Høyest sum på 3 piler vinner runden. Først til flest rundeseiere vinner.',
    available: true
  },
  {
    id: 'killer',
    title: 'Killer',
    description: 'Treff eget tall 3 ganger for å bli Killer, fjern liv fra motstandere. Siste spiller igjen vinner.',
    available: true
  }
];

// Storage key each game writes its match state to — used to tell whether there's an
// in-progress match to badge as "Pågår" on its card.
const MATCH_STATE_KEYS: Partial<Record<GameType, string>> = {
  clock: 'darts-clock-state',
  cricket: 'darts-cricket-state',
  halveit: 'darts-halveit-state',
  highlow: 'darts-highlow-state',
  killer: 'darts-killer-state'
};

function getActiveGames(): Set<GameType> {
  const active = new Set<GameType>();
  (Object.keys(MATCH_STATE_KEYS) as GameType[]).forEach(type => {
    const key = MATCH_STATE_KEYS[type];
    if (key && window.localStorage.getItem(key)) active.add(type);
  });

  // x01 and x01-duo share one storage key — inspect the saved config to know which card
  // the in-progress match actually belongs to.
  const x01Raw = window.localStorage.getItem('darts-match-state');
  if (x01Raw) {
    try {
      const parsed = JSON.parse(x01Raw);
      active.add(parsed?.config?.sameScorePenalty ? 'x01-duo' : 'x01');
    } catch {
      // malformed state — ignore, no badge
    }
  }
  return active;
}

export function GameSelector({ onSelect }: { onSelect: (game: GameType) => void }) {
  const [activeGames, setActiveGames] = useState<Set<GameType>>(new Set());

  useEffect(() => {
    setActiveGames(getActiveGames());
  }, []);

  return (
    <main className="page">
      <h1>
        Velg spill <span lang="en">Darts</span>
      </h1>
      <div className="game-selector-grid">
        {GAMES.map(game => (
          <button
            key={game.id}
            className="game-selector-card"
            onClick={() => game.available && onSelect(game.id)}
            disabled={!game.available}
          >
            <div className="game-selector-title">
              {game.title}
              {!game.available && <span className="game-selector-badge">Kommer snart</span>}
              {game.available && activeGames.has(game.id) && (
                <span className="game-selector-badge-active">Pågår</span>
              )}
            </div>
            <div className="game-selector-description">{game.description}</div>
          </button>
        ))}
      </div>
    </main>
  );
}
