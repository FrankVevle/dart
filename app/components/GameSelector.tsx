'use client';

export type GameType = 'x01' | 'x01-duo' | 'clock' | 'cricket' | 'halveit' | 'highlow';

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
    available: false
  },
  {
    id: 'highlow',
    title: 'High-Low',
    description: 'Høyest sum på 3 piler vinner runden. Først til flest rundeseiere vinner.',
    available: false
  }
];

export function GameSelector({ onSelect }: { onSelect: (game: GameType) => void }) {
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
            </div>
            <div className="game-selector-description">{game.description}</div>
          </button>
        ))}
      </div>
    </main>
  );
}
