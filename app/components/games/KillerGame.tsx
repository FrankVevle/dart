'use client';

import { useEffect, useRef, useState } from 'react';
import { KillerEngine, KillerMatchState, KillerThrowResult } from '@/lib/games/KillerEngine';
import { DartBoard } from '../DartBoard';
import { HelpModal } from '../HelpModal';
import { Fireworks } from '../Fireworks';
import { announce, playBustSound, playFanfareSound, playMissSound } from '@/lib/audio';

const STORAGE_KEY = 'darts-killer-state';
const SEGMENTS = Array.from({ length: 20 }, (_, i) => i + 1);
const PLAYER_COLORS = ['#58a6ff', '#f85149', '#d29922', '#bc8cff', '#3fb950', '#39c5cf'];
const AVATAR_MAX_SIZE = 128;

type PlayerSetup = { name: string; photo?: string };

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

export function KillerGame({ onExit }: { onExit: () => void }) {
  const engineRef = useRef<KillerEngine | null>(null);
  const [, bumpVersion] = useState(0);
  const rerender = () => bumpVersion(v => v + 1);

  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([{ name: 'Spiller 1' }, { name: 'Spiller 2' }]);
  const [startingLives, setStartingLives] = useState(5);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [lastResult, setLastResult] = useState<KillerThrowResult | null>(null);
  const [throwSeq, setThrowSeq] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      engineRef.current = KillerEngine.restore(JSON.parse(saved) as KillerMatchState, persist);
      rerender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(state: KillerMatchState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    rerender();
  }

  function startMatch() {
    const setups = playerSetups.filter(p => p.name.trim().length > 0);
    if (setups.length < 2) return;
    const engine = new KillerEngine(
      setups.map(p => p.name.trim()),
      Math.max(1, startingLives),
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

  function endMatchAndReturnToSetup() {
    if (window.confirm('Avslutte kampen og gå tilbake til spilleroppsett? Fremgangen i denne kampen forsvinner.')) {
      newMatch();
    }
  }

  function throwAt(segment: number, dartMultiplier: 1 | 2 | 3) {
    const engine = engineRef.current;
    if (!engine || engine.isMatchOver) return;
    const result = engine.throwDart(segment, dartMultiplier);
    setLastResult(result);
    setThrowSeq(s => s + 1);
    if (multiplier !== 1) setMultiplier(1);

    if (result.status === 'miss') {
      playMissSound();
    } else if (result.status === 'self-hit') {
      playBustSound();
      announce('Friendly fire!');
    } else if (result.status === 'win') {
      const winner = engine.players.find(p => p.id === engine.winnerId);
      playFanfareSound();
      announce(winner ? `${winner.name} wins! Game shot!` : 'Game shot!');
    }
  }

  function throwSegment(segment: number) {
    throwAt(segment, multiplier);
  }

  function throwMiss() {
    throwAt(0, 1);
  }

  const engine = engineRef.current;

  const header = (
    <div className="page-header">
      <button className="header-back-btn" onClick={onExit} aria-label="Bytt spilltype" title="Bytt spilltype">
        ←
      </button>
      <h1>Killer</h1>
      <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Hjelp">
        ?
      </button>
    </div>
  );
  const helpModal = showHelp && <HelpModal game="killer" onClose={() => setShowHelp(false)} />;

  if (!engine) {
    return (
      <main className="page">
        {header}
        {helpModal}
        <div className="card">
          <p className="camera-hint">
            Alle får tildelt et tilfeldig tall (1–20). Treff ditt eget tall 3 ganger (single/double/triple teller
            som i Cricket) for å bli en Killer. Som Killer kan du treffe motstanderes tall for å fjerne liv fra
            dem — men treffer du ditt eget tall etter det, mister du selv liv! Siste spiller med liv igjen vinner.
          </p>
          <label>Spillere (minst 2)</label>
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
            <button
              className="btn"
              onClick={() => setPlayerSetups([...playerSetups, { name: `Spiller ${playerSetups.length + 1}` }])}
            >
              + Legg til spiller
            </button>
          </div>
        </div>

        <div className="card">
          <label>Antall liv</label>
          <input
            type="number"
            min={1}
            value={startingLives}
            onChange={e => setStartingLives(parseInt(e.target.value, 10) || 1)}
          />
        </div>

        <button className="btn primary" onClick={startMatch} disabled={playerSetups.filter(p => p.name.trim()).length < 2}>
          Start kamp
        </button>
      </main>
    );
  }

  if (engine.isMatchOver) {
    const winner = engine.players.find(p => p.id === engine.winnerId);
    const losers = engine.players.filter(p => p.id !== engine.winnerId).sort((a, b) => b.lives - a.lives);
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
          <p className="winner-legs">{winner?.lives} liv igjen</p>

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
                    <span className="loser-legs">{p.lives} liv</span>
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

  const active = engine.getActivePlayer();
  const targetName = (id?: string) => engine.players.find(p => p.id === id)?.name;

  return (
    <main className="page">
      {header}
      {helpModal}

      {lastResult?.status === 'miss' && (
        <div key={throwSeq} className="status-banner miss miss-anim">
          Bom!
        </div>
      )}
      {lastResult?.status === 'building' && (
        <div key={throwSeq} className="status-banner valid">
          {active.name} bygger mot eget tall ({active.marks}/3 merker)
        </div>
      )}
      {lastResult?.status === 'became-killer' && (
        <div key={throwSeq} className="status-banner valid">
          🔪 {active.name} er nå en Killer!
        </div>
      )}
      {lastResult?.status === 'opponent-hit' && (
        <div key={throwSeq} className="status-banner valid">
          🎯 {active.name} traff {targetName(lastResult.targetPlayerId)} sitt tall og fjernet {lastResult.livesLost} liv!
        </div>
      )}
      {lastResult?.status === 'self-hit' && (
        <div key={throwSeq} className="status-banner bust bust-anim">
          💥 {active.name} traff eget tall og mistet {lastResult.livesLost} liv (friendly fire)!
        </div>
      )}

      <div className="scoreboard">
        {engine.players.map((p, i) => (
          <div
            key={p.id}
            className={`player-card ${i === engine.currentPlayerIndex ? 'active' : ''}`}
            style={p.lives <= 0 ? { opacity: 0.4 } : undefined}
          >
            <div className="player-name">{p.name}</div>
            <div className="player-score">{p.lives <= 0 ? 'Ute' : p.lives}</div>
            <div className="player-legs">
              Tall: {p.assignedNumber} · {p.isKiller ? '🔪 Killer' : `${p.marks}/3 merker`}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="turn-info">
          <strong>{active.name} kaster</strong>
          <span className="turn-darts">Pil {engine.dartsThisTurn + 1} av 3</span>
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

        <button className="miss-btn" onClick={throwMiss}>
          Bom (0)
        </button>

        <div className="utility-row">
          <button className="btn" onClick={endMatchAndReturnToSetup}>
            Avslutt kamp
          </button>
        </div>
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
