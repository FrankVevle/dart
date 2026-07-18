'use client';

import { useEffect, useRef, useState } from 'react';
import { HALVE_IT_ROUNDS, HalveItEngine, HalveItMatchState, halveItRoundLabel } from '@/lib/games/HalveItEngine';
import { DartBoard } from '../DartBoard';
import { HelpModal } from '../HelpModal';
import { Fireworks } from '../Fireworks';
import { announce, playBustSound, playFanfareSound, playMissSound } from '@/lib/audio';

const STORAGE_KEY = 'darts-halveit-state';
const SEGMENTS = Array.from({ length: 20 }, (_, i) => i + 1);
const PLAYER_COLORS = ['#58a6ff', '#f85149', '#d29922', '#bc8cff', '#3fb950', '#39c5cf'];
const AVATAR_MAX_SIZE = 128;

type PlayerSetup = { name: string; photo?: string };
type ThrowResult = { status: 'hit' | 'miss' | 'win'; pointsScored: number; halved: boolean } | null;

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

export function HalveItGame({ onExit }: { onExit: () => void }) {
  const engineRef = useRef<HalveItEngine | null>(null);
  const [, bumpVersion] = useState(0);
  const rerender = () => bumpVersion(v => v + 1);

  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([{ name: 'Spiller 1' }, { name: 'Spiller 2' }]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [lastResult, setLastResult] = useState<ThrowResult>(null);
  const [throwSeq, setThrowSeq] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      engineRef.current = HalveItEngine.restore(JSON.parse(saved) as HalveItMatchState, persist);
      rerender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(state: HalveItMatchState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    rerender();
  }

  function startMatch() {
    const setups = playerSetups.filter(p => p.name.trim().length > 0);
    if (setups.length < 1) return;
    const engine = new HalveItEngine(
      setups.map(p => p.name.trim()),
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

    if (result.halved) {
      playBustSound();
      announce('Halved!');
    } else if (result.status === 'miss') {
      playMissSound();
    }
    if (result.status === 'win') {
      const winners = engine.players.filter(p => engine.winnerIds.includes(p.id));
      playFanfareSound();
      announce(
        winners.length === 1 && winners[0] ? `${winners[0].name} wins! Game shot!` : 'Game shot! It\'s a tie!'
      );
    }
  }

  function throwSegment(segment: number) {
    throwAt(segment, multiplier);
    if (multiplier !== 1) setMultiplier(1);
  }

  function throwBull(double: boolean) {
    throwAt(25, double ? 2 : 1);
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
      <h1>Halve-it</h1>
      <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Hjelp">
        ?
      </button>
    </div>
  );
  const helpModal = showHelp && <HelpModal game="halveit" onClose={() => setShowHelp(false)} />;

  if (!engine) {
    return (
      <main className="page">
        {header}
        {helpModal}
        <div className="card">
          <p className="camera-hint">
            10 faste runder: 20, Double, 19, Triple, 18, 17, Bull, 16, 15, Double. Treff målet for runden og
            poengsummen legges til. Bommer du helt (alle 3 piler) den runden, halveres hele poengsummen din. Høyest
            poengsum til slutt vinner.
          </p>
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

        <button className="btn primary" onClick={startMatch}>
          Start kamp
        </button>
      </main>
    );
  }

  if (engine.isMatchOver) {
    const winners = engine.players.filter(p => engine.winnerIds.includes(p.id));
    const losers = engine.players.filter(p => !engine.winnerIds.includes(p.id)).sort((a, b) => b.score - a.score);
    const winner = winners[0];
    return (
      <main className="page">
        {header}
        {helpModal}
        <Fireworks active={true} />
        <div className="card overlay">
          <div className="winner-badge">{winners.length > 1 ? 'Tie' : 'Winner'}</div>
          {winner?.photo ? (
            <img src={winner.photo} alt="" className="winner-photo" />
          ) : (
            <div className="winner-photo winner-photo-placeholder">🏆</div>
          )}
          <h2 className="winner-name">{winners.map(w => w.name).join(' & ')}</h2>
          <p className="winner-legs">{winner?.score} poeng</p>

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
                    <span className="loser-legs">{p.score} poeng</span>
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
  const round = engine.getCurrentRound();

  return (
    <main className="page">
      {header}
      {helpModal}

      {lastResult?.halved && (
        <div key={throwSeq} className="status-banner bust bust-anim">
          💥 Bom på hele runden! Poengsummen halveres.
        </div>
      )}
      {!lastResult?.halved && lastResult?.status === 'miss' && (
        <div key={throwSeq} className="status-banner miss miss-anim">
          Bom!
        </div>
      )}
      {!lastResult?.halved && lastResult?.status !== 'miss' && lastResult?.pointsScored ? (
        <div key={throwSeq} className="status-banner valid">
          +{lastResult.pointsScored} poeng!
        </div>
      ) : null}

      <div className="card">
        <div className="turn-info">
          <strong>
            Runde {engine.currentRoundIndex + 1} av {HALVE_IT_ROUNDS.length}: {halveItRoundLabel(round)}
          </strong>
        </div>
      </div>

      <div className="scoreboard">
        {engine.players.map((p, i) => (
          <div key={p.id} className={`player-card ${i === engine.currentPlayerIndex ? 'active' : ''}`}>
            <div className="player-name">{p.name}</div>
            <div className="player-score">{p.score}</div>
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

        <div className="bull-row">
          <button onClick={() => throwBull(false)}>Bull (25)</button>
          <button onClick={() => throwBull(true)}>Bullseye (50)</button>
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
