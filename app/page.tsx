'use client';

import { useEffect, useState } from 'react';
import { GameSelector, GameType } from './components/GameSelector';
import { X01Game } from './components/games/X01Game';
import { AroundTheClockGame } from './components/games/AroundTheClockGame';
import { CricketGame } from './components/games/CricketGame';
import { HalveItGame } from './components/games/HalveItGame';
import { HighLowGame } from './components/games/HighLowGame';
import { KillerGame } from './components/games/KillerGame';

const ACTIVE_GAME_KEY = 'darts-active-game-type';

// Storage key each game writes its match state to — used to tell an actual in-progress
// (or just-finished) match apart from merely having clicked into a game's setup screen.
const MATCH_STATE_KEYS: Record<GameType, string> = {
  x01: 'darts-match-state',
  'x01-duo': 'darts-match-state',
  clock: 'darts-clock-state',
  cricket: 'darts-cricket-state',
  halveit: 'darts-halveit-state',
  highlow: 'darts-highlow-state',
  killer: 'darts-killer-state'
};

export default function Home() {
  const [gameType, setGameType] = useState<GameType | null>(null);

  // Restore which game was active so a reload mid-match doesn't dump you back at the
  // selector — done in an effect (not a lazy initializer) so the client's first render
  // matches the statically prerendered HTML and avoids a hydration mismatch.
  // Only restore if that game actually has saved match state — otherwise a stale pointer
  // (e.g. from clicking into a game's setup screen without starting a match) would keep
  // skipping the selector on every future visit.
  useEffect(() => {
    const saved = window.localStorage.getItem(ACTIVE_GAME_KEY) as GameType | null;
    if (saved && window.localStorage.getItem(MATCH_STATE_KEYS[saved])) {
      setGameType(saved);
    } else if (saved) {
      window.localStorage.removeItem(ACTIVE_GAME_KEY);
    }
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
  if (gameType === 'cricket') return <CricketGame onExit={exitToSelector} />;
  if (gameType === 'halveit') return <HalveItGame onExit={exitToSelector} />;
  if (gameType === 'highlow') return <HighLowGame onExit={exitToSelector} />;
  if (gameType === 'killer') return <KillerGame onExit={exitToSelector} />;

  return <GameSelector onSelect={selectGame} />;
}
