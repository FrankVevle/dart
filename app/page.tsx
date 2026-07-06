'use client';

import { useEffect, useRef, useState } from 'react';
import { DartsMatchEngine, MatchConfig, MatchState } from '@/lib/DartsMatchEngine';
import { DartBoard } from './components/DartBoard';

const STORAGE_KEY = 'darts-match-state';
const SEGMENTS = Array.from({ length: 20 }, (_, i) => i + 1);
const PLAYER_COLORS = ['#58a6ff', '#f85149', '#d29922', '#bc8cff', '#3fb950', '#39c5cf'];

type ThrowResult = { status: 'valid' | 'bust' | 'leg-win' | 'match-win'; scoreRemaining: number } | null;

export default function Home() {
  const engineRef = useRef<DartsMatchEngine | null>(null);
  const [, bumpVersion] = useState(0);
  const rerender = () => bumpVersion(v => v + 1);

  const [playerNames, setPlayerNames] = useState(['Spiller 1', 'Spiller 2']);
  const [startingScore, setStartingScore] = useState<301 | 501>(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [legsToWin, setLegsToWin] = useState(3);

  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [lastResult, setLastResult] = useState<ThrowResult>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      engineRef.current = DartsMatchEngine.restore(JSON.parse(saved) as MatchState, persist);
      rerender();
    }
  }, []);

  function persist(state: MatchState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    rerender();
  }

  function startMatch() {
    const names = playerNames.map(n => n.trim()).filter(Boolean);
    if (names.length < 1) return;
    const config: MatchConfig = { startingScore, doubleOut, legsToWin: Math.max(1, legsToWin) };
    engineRef.current = new DartsMatchEngine(names, config, persist);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(engineRef.current.toJSON()));
    setLastResult(null);
    rerender();
  }

  function newMatch() {
    window.localStorage.removeItem(STORAGE_KEY);
    engineRef.current = null;
    setLastResult(null);
    rerender();
  }

  function throwAt(segment: number, dartMultiplier: 1 | 2 | 3) {
    const engine = engineRef.current;
    if (!engine || engine.isMatchOver || engine.isLegOver) return;
    const result = engine.throwDart(segment, dartMultiplier);
    setLastResult(result);
  }

  function throwSegment(segment: number) {
    throwAt(segment, multiplier);
  }

  function throwBull(double: boolean) {
    throwAt(25, double ? 2 : 1);
  }

  function throwMiss() {
    throwAt(0, 1);
  }

  function undoTurn() {
    engineRef.current?.undoCurrentTurn();
    setLastResult(null);
  }

  function nextLeg() {
    engineRef.current?.startNextLeg();
    setLastResult(null);
  }

  const engine = engineRef.current;

  if (!engine) {
    return (
      <main className="page">
        <h1>301 / 501 Darts</h1>
        <div className="card">
          <label>Spillere</label>
          {playerNames.map((name, i) => (
            <div className="player-row" key={i}>
              <input
                type="text"
                value={name}
                onChange={e => {
                  const next = [...playerNames];
                  next[i] = e.target.value;
                  setPlayerNames(next);
                }}
                placeholder={`Spiller ${i + 1}`}
              />
              {playerNames.length > 1 && (
                <button className="btn remove" onClick={() => setPlayerNames(playerNames.filter((_, idx) => idx !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="btn-row">
            <button className="btn" onClick={() => setPlayerNames([...playerNames, `Spiller ${playerNames.length + 1}`])}>
              + Legg til spiller
            </button>
          </div>
        </div>

        <div className="card">
          <label>Startpoeng</label>
          <div className="toggle-group">
            <button className={startingScore === 301 ? 'active' : ''} onClick={() => setStartingScore(301)}>
              301
            </button>
            <button className={startingScore === 501 ? 'active' : ''} onClick={() => setStartingScore(501)}>
              501
            </button>
          </div>

          <div className="checkbox-row">
            <input type="checkbox" id="doubleOut" checked={doubleOut} onChange={e => setDoubleOut(e.target.checked)} />
            <label htmlFor="doubleOut">Double-out (må avslutte på en dobbel)</label>
          </div>

          <label>Først til antall legs</label>
          <input
            type="number"
            min={1}
            value={legsToWin}
            onChange={e => setLegsToWin(parseInt(e.target.value, 10) || 1)}
          />
        </div>

        <button className="btn primary" onClick={startMatch}>
          Start kamp
        </button>
      </main>
    );
  }

  if (engine.isMatchOver) {
    const winner = engine.players.find(p => p.id === engine.matchWinnerId);
    return (
      <main className="page">
        <h1>301 / 501 Darts</h1>
        <div className="card overlay">
          <h2>🏆 {winner?.name} vant kampen!</h2>
          <p>
            {engine.players.map(p => `${p.name}: ${p.legsWon} legs`).join(' · ')}
          </p>
          <button className="btn primary" onClick={newMatch}>
            Ny kamp
          </button>
        </div>
      </main>
    );
  }

  if (engine.isLegOver) {
    const winner = engine.players.find(p => p.id === engine.legWinnerId);
    return (
      <main className="page">
        <h1>301 / 501 Darts</h1>
        <div className="card overlay">
          <h2>{winner?.name} vant legen!</h2>
          <p>{engine.players.map(p => `${p.name}: ${p.legsWon} legs`).join(' · ')}</p>
          <button className="btn primary" onClick={nextLeg}>
            Neste leg
          </button>
        </div>
      </main>
    );
  }

  const active = engine.getActivePlayer();
  const turnSoFar = engine.currentTurnDarts.reduce((a, b) => a + b, 0);
  const remainingThisTurn = active.currentScore - turnSoFar;

  return (
    <main className="page">
      <h1>301 / 501 Darts</h1>

      {lastResult?.status === 'bust' && <div className="status-banner bust">BUST! Turen telles ikke.</div>}
      {lastResult?.status === 'valid' && engine.currentTurnDarts.length === 0 && (
        <div className="status-banner valid">Tur registrert.</div>
      )}

      <div className="scoreboard">
        {engine.players.map((p, i) => (
          <div key={p.id} className={`player-card ${i === engine.currentPlayerIndex ? 'active' : ''}`}>
            <div className="player-name">{p.name}</div>
            <div className="player-score">{p.currentScore}</div>
            <div className="player-legs">{p.legsWon} legs</div>
            {i === engine.currentPlayerIndex && (
              <div className="checkout-hint">
                {(engine.getCheckoutHint(remainingThisTurn) || []).join(' → ') || ' '}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="turn-info">
          <strong>{active.name} kaster</strong>
          <span className="turn-darts">
            Pil {engine.currentTurnDarts.length + 1} av 3
            {engine.currentTurnDarts.length > 0 && ` · kastet: ${engine.currentTurnDarts.join(', ')}`}
          </span>
        </div>

        <div className="multiplier-row">
          {[1, 2, 3].map(m => (
            <button key={m} className={multiplier === m ? 'active' : ''} onClick={() => setMultiplier(m as 1 | 2 | 3)}>
              {m === 1 ? 'Single' : m === 2 ? 'Double' : 'Triple'}
            </button>
          ))}
        </div>

        <div className="segment-grid">
          {SEGMENTS.map(seg => (
            <button key={seg} onClick={() => throwSegment(seg)}>
              {seg}
            </button>
          ))}
        </div>

        <div className="bull-row">
          <button onClick={() => throwBull(false)}>Bull (25)</button>
          <button onClick={() => throwBull(true)}>Bullseye (50)</button>
        </div>

        <button className="miss-btn" onClick={throwMiss}>
          Bom (0)
        </button>

        <div className="utility-row">
          <button className="btn" onClick={undoTurn} disabled={engine.currentTurnDarts.length === 0}>
            Angre denne turen
          </button>
          <button className="btn" onClick={newMatch}>
            Avslutt kamp
          </button>
        </div>
      </div>

      <div className="card">
        <details>
          <summary>Historikk</summary>
          {engine.players.map(p => (
            <div key={p.id} className="history">
              <strong>{p.name}</strong>
              {p.history.map((leg, legIdx) => (
                <div key={legIdx}>
                  <div className="history-leg">Leg {legIdx + 1}</div>
                  <div className="history-turns">
                    {leg.length === 0 && <span className="history-turn">–</span>}
                    {leg.map((turn, turnIdx) => (
                      <span key={turnIdx} className="history-turn">
                        {turn.reduce((a, b) => a + b, 0)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </details>
      </div>

      <div className="card">
        <h2 className="section-title">Kastfordeling</h2>
        <div className="dartboard-grid">
          {engine.players.map((p, i) => (
            <div key={p.id} className="dartboard-cell">
              <div className="dartboard-cell-title">
                {p.name} <span className="dartboard-cell-count">({p.dartsThrown.length} kast)</span>
              </div>
              <DartBoard throws={p.dartsThrown} dotColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
