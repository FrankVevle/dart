'use client';

import { useEffect, useState } from 'react';
import { GameSelector, GameType } from './components/GameSelector';
import { X01Game } from './components/games/X01Game';
import { AroundTheClockGame } from './components/games/AroundTheClockGame';

const ACTIVE_GAME_KEY = 'darts-active-game-type';

export default function Home() {
  const [gameType, setGameType] = useState<GameType | null>(null);

  // Restore which game was active so a reload mid-match doesn't dump you back at the
  // selector — done in an effect (not a lazy initializer) so the client's first render
  // matches the statically prerendered HTML and avoids a hydration mismatch.
  useEffect(() => {
    const saved = window.localStorage.getItem(ACTIVE_GAME_KEY);
    if (saved) setGameType(saved as GameType);
  }, []);

  function selectGame(type: GameType) {
    window.localStorage.setItem(ACTIVE_GAME_KEY, type);
    setGameType(type);
  }

  function exitToSelector() {
    window.localStorage.removeItem(ACTIVE_GAME_KEY);
    setGameType(null);
  }

  if (gameType === 'x01') return <X01Game onExit={exitToSelector} />;
  if (gameType === 'x01-duo') return <X01Game onExit={exitToSelector} duo />;
  if (gameType === 'clock') return <AroundTheClockGame onExit={exitToSelector} />;

  return <GameSelector onSelect={selectGame} />;
}
