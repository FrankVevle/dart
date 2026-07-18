'use client';

import { useState } from 'react';
import { GameSelector, GameType } from './components/GameSelector';
import { X01Game } from './components/games/X01Game';
import { AroundTheClockGame } from './components/games/AroundTheClockGame';
import { CricketGame } from './components/games/CricketGame';
import { HalveItGame } from './components/games/HalveItGame';
import { HighLowGame } from './components/games/HighLowGame';
import { KillerGame } from './components/games/KillerGame';

export default function Home() {
  const [gameType, setGameType] = useState<GameType | null>(null);

  function exitToSelector() {
    setGameType(null);
  }

  if (gameType === 'x01') return <X01Game onExit={exitToSelector} />;
  if (gameType === 'x01-duo') return <X01Game onExit={exitToSelector} duo />;
  if (gameType === 'clock') return <AroundTheClockGame onExit={exitToSelector} />;
  if (gameType === 'cricket') return <CricketGame onExit={exitToSelector} />;
  if (gameType === 'halveit') return <HalveItGame onExit={exitToSelector} />;
  if (gameType === 'highlow') return <HighLowGame onExit={exitToSelector} />;
  if (gameType === 'killer') return <KillerGame onExit={exitToSelector} />;

  return <GameSelector onSelect={setGameType} />;
}
