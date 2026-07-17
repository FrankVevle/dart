'use client';

import { useEffect, useRef, useState } from 'react';
import { DartsMatchEngine, MatchConfig, MatchState } from '@/lib/DartsMatchEngine';
import { DartBoard } from './components/DartBoard';
import { HelpModal } from './components/HelpModal';
import { Confetti } from './components/Confetti';
import { Fireworks } from './components/Fireworks';
import { announce, playBullseyeSound, playBustSound, playFanfareSound, playMissSound } from '@/lib/audio';

const STORAGE_KEY = 'darts-match-state';
const SEGMENTS = Array.from({ length: 20 }, (_, i) => i + 1);
const PLAYER_COLORS = ['#58a6ff', '#f85149', '#d29922', '#bc8cff', '#3fb950', '#39c5cf'];
const AVATAR_MAX_SIZE = 128;

type ThrowResult = { status: 'valid' | 'bust' | 'leg-win' | 'match-win'; scoreRemaining: number } | null;
type PlayerSetup = { name: string; photo?: string };

// Downscale to a small square JPEG data URL so avatars don't blow up localStorage.
function resizeImageToDataUrl(file: File, maxSize = AVATAR_MAX_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Kunne ikke lese bildet'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ikke støttet'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const engineRef = useRef<DartsMatchEngine | null>(null);
  const [, bumpVersion] = useState(0);
  const rerender = () => bumpVersion(v => v + 1);

  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([{ name: 'Spiller 1' }, { name: 'Spiller 2' }]);
  const [startingScore, setStartingScore] = useState<301 | 501>(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [legsToWin, setLegsToWin] = useState(3);

  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [lastResult, setLastResult] = useState<ThrowResult>(null);
  const [lastThrowWasMiss, setLastThrowWasMiss] = useState(false);
  const [throwSeq, setThrowSeq] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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
    const setups = playerSetups.filter(p => p.name.trim().length > 0);
    if (setups.length < 1) return;
    const config: MatchConfig = { startingScore, doubleOut, legsToWin: Math.max(1, legsToWin) };
    const engine = new DartsMatchEngine(
      setups.map(p => p.name.trim()),
      config,
      persist
    );
    engine.players.forEach((player, i) => {
      player.photo = setups[i].photo;
    });
    engineRef.current = engine;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(engine.toJSON()));
    setLastResult(null);
    rerender();
  }

  async function handlePhotoChange(index: number, file: File | undefined) {
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file);
    setPlayerSetups(setups => setups.map((p, i) => (i === index ? { ...p, photo: dataUrl } : p)));
  }

  function newMatch() {
    window.localStorage.removeItem(STORAGE_KEY);
    engineRef.current = null;
    setLastResult(null);
    rerender();
  }

  // The only way back to the player-setup screen is ending the current match — make that
  // explicit and require confirmation so it's not an accidental tap that loses progress.
  function endMatchAndReturnToSetup() {
    if (window.confirm('Avslutte kampen og gå tilbake til spilleroppsett? Fremgangen i denne kampen forsvinner.')) {
      newMatch();
    }
  }

  function throwAt(segment: number, dartMultiplier: 1 | 2 | 3, isMiss = false) {
    const engine = engineRef.current;
    if (!engine || engine.isMatchOver || engine.isLegOver) return undefined;
    const result = engine.throwDart(segment, dartMultiplier);
    setLastResult(result);
    setLastThrowWasMiss(isMiss);
    setThrowSeq(s => s + 1);

    if (result.status === 'bust') {
      playBustSound();
      announce('Bust!');
    } else if (result.status === 'match-win') {
      const winner = engine.players.find(p => p.id === engine.matchWinnerId);
      playFanfareSound();
      announce(winner ? `${winner.name} wins! Game shot!` : 'Game shot!');
    }
    return result;
  }

  function throwSegment(segment: number) {
    throwAt(segment, multiplier);
  }

  function throwBull(double: boolean) {
    const result = throwAt(25, double ? 2 : 1);
    if (double) {
      setShowConfetti(true);
      // Don't step on the bust/win announcement that throwAt() already fired.
      if (result?.status !== 'bust' && result?.status !== 'match-win') {
        playBullseyeSound();
        announce('Bullseye!');
      }
    }
  }

  function throwMiss() {
    throwAt(0, 1, true);
    playMissSound();
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

  const header = (
    <div className="page-header">
      <h1>
        301 / 501 <span lang="en">Darts</span>
      </h1>
      <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Hjelp">
        ?
      </button>
    </div>
  );
  const helpModal = showHelp && <HelpModal onClose={() => setShowHelp(false)} />;

  if (!engine) {
    return (
      <main className="page">
        {header}
        {helpModal}
        <div className="card">
          <label>Spillere</label>
          {playerSetups.map((setup, i) => (
            <div className="player-row" key={i}>
              <label className="avatar-picker">
                {setup.photo ? (
                  <img src={setup.photo} alt="" className="avatar-preview" />
                ) : (
                  <span className="avatar-placeholder">+</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="avatar-input"
                  onChange={e => handlePhotoChange(i, e.target.files?.[0])}
                />
              </label>
              <input
                type="text"
                value={setup.name}
                onChange={e => {
                  const next = [...playerSetups];
                  next[i] = { ...next[i], name: e.target.value };
                  setPlayerSetups(next);
                }}
                placeholder={`Spiller ${i + 1}`}
              />
              {playerSetups.length > 1 && (
                <button className="btn remove" onClick={() => setPlayerSetups(playerSetups.filter((_, idx) => idx !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="btn-row">
            <button className="btn" onClick={() => setPlayerSetups([...playerSetups, { name: `Spiller ${playerSetups.length + 1}` }])}>
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
    const losers = engine.players.filter(p => p.id !== engine.matchWinnerId);
    return (
      <main className="page">
        {header}
        {helpModal}
        <Fireworks active={true} />
        <div className="card overlay">
          <div className="winner-badge">Winner</div>
          {winner?.photo ? (
            <img src={winner.photo} alt="" className="winner-photo" />
          ) : (
            <div className="winner-photo winner-photo-placeholder">🏆</div>
          )}
          <h2 className="winner-name">{winner?.name}</h2>
          <p className="winner-legs">{winner?.legsWon} legs</p>

          {losers.length > 0 && (
            <div className="losers-section">
              <div className="losers-badge">Losers</div>
              <div className="losers-list">
                {losers.map(p => (
                  <div key={p.id} className="loser-row">
                    {p.photo ? (
                      <img src={p.photo} alt="" className="loser-photo" />
                    ) : (
                      <div className="loser-photo loser-photo-placeholder">{p.name.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="loser-name">{p.name}</span>
                    <span className="loser-legs">{p.legsWon} legs</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        {header}
        {helpModal}
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
      {header}
      {helpModal}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {lastResult?.status === 'bust' && (
        <div key={throwSeq} className="status-banner bust bust-anim">
          💥 BUST! Turen telles ikke.
        </div>
      )}
      {lastResult?.status === 'valid' && lastThrowWasMiss && (
        <div key={throwSeq} className="status-banner miss miss-anim">
          Bom!
        </div>
      )}
      {lastResult?.status === 'valid' && !lastThrowWasMiss && engine.currentTurnDarts.length === 0 && (
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
                {(engine.getCheckoutHint(remainingThisTurn, 3 - engine.currentTurnDarts.length) || []).join(' → ') || ' '}
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
          <button className="btn" onClick={endMatchAndReturnToSetup}>
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
              <DartBoard throws={p.dartsThrown} dotColor={PLAYER_COLORS[i % PLAYER_COLORS.length]} avatarUrl={p.photo} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
