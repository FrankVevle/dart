'use client';

import { useEffect, useRef, useState } from 'react';
import { HighLowEngine, HighLowMatchState } from '@/lib/games/HighLowEngine';
import { DartBoard } from '../DartBoard';
import { HelpModal } from '../HelpModal';
import { Fireworks } from '../Fireworks';
import { announce, playFanfareSound } from '@/lib/audio';

const STORAGE_KEY = 'darts-highlow-state';
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

export function HighLowGame({ onExit }: { onExit: () => void }) {
  const engineRef = useRef<HighLowEngine | null>(null);
  const [, bumpVersion] = useState(0);
  const rerender = () => bumpVersion(v => v + 1);

  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([{ name: 'Spiller 1' }, { name: 'Spiller 2' }]);
  const [roundsToWin, setRoundsToWin] = useState(5);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [throwSeq, setThrowSeq] = useState(0);
  const [justCompletedRound, setJustCompletedRound] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      engineRef.current = HighLowEngine.restore(JSON.parse(saved) as HighLowMatchState, persist);
      rerender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(state: HighLowMatchState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    rerender();
  }

  function startMatch() {
    const setups = playerSetups.filter(p => p.name.trim().length > 0);
    if (setups.length < 1) return;
    const engine = new HighLowEngine(
      setups.map(p => p.name.trim()),
      Math.max(1, roundsToWin),
      persist
    );
    engine.players.forEach((player, i) => {
      player.photo = setups[i].photo;
    });
    engineRef.current = engine;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(engine.toJSON()));
    setJustCompletedRound(false);
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
    setJustCompletedRound(false);
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
    setThrowSeq(s => s + 1);
    setJustCompletedRound(result.roundComplete);

    if (result.matchOver) {
      const winner = engine.players.find(p => p.id === engine.winnerId);
      playFanfareSound();
      announce(winner ? `${winner.name} wins! Game shot!` : 'Game shot!');
    }
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

  const engine = engineRef.current;

  const header = (
    <div className="page-header">
      <h1>High-Low</h1>
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
        <button className="btn back-to-selector" onClick={onExit}>
          ← Bytt spilltype
        </button>
        <div className="card">
          <p className="camera-hint">
            Hver runde kaster alle 3 piler. Høyest sum vinner rundepoenget — blir det uavgjort på
            toppscoren, får ingen poeng den runden. Først til antall rundeseiere vinner kampen.
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

        <div className="card">
          <label>Først til antall rundeseiere</label>
          <input
            type="number"
            min={1}
            value={roundsToWin}
            onChange={e => setRoundsToWin(parseInt(e.target.value, 10) || 1)}
          />
        </div>

        <button className="btn primary" onClick={startMatch}>
          Start kamp
        </button>
      </main>
    );
  }

  if (engine.isMatchOver) {
    const winner = engine.players.find(p => p.id === engine.winnerId);
    const losers = engine.players.filter(p => p.id !== engine.winnerId).sort((a, b) => b.roundWins - a.roundWins);
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
          <p className="winner-legs">{winner?.roundWins} rundeseiere</p>

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
                    <span className="loser-legs">{p.roundWins} rundeseiere</span>
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

  return (
    <main className="page">
      {header}
      {helpModal}

      {justCompletedRound && (
        <div key={throwSeq} className="status-banner valid">
          {engine.lastRoundWinnerId
            ? `${engine.players.find(p => p.id === engine.lastRoundWinnerId)?.name} vant runden!`
            : 'Uavgjort denne runden — ingen får poeng.'}
          {engine.lastRoundSums &&
            ' (' +
              engine.players.map(p => `${p.name}: ${engine.lastRoundSums?.[p.id] ?? 0}`).join(' · ') +
              ')'}
        </div>
      )}

      <div className="card">
        <div className="turn-info">
          <strong>Runde {engine.roundNumber}</strong>
        </div>
      </div>

      <div className="scoreboard">
        {engine.players.map((p, i) => (
          <div key={p.id} className={`player-card ${i === engine.currentPlayerIndex ? 'active' : ''}`}>
            <div className="player-name">{p.name}</div>
            <div className="player-score">{engine.currentRoundSums[p.id] ?? 0}</div>
            <div className="player-legs">{p.roundWins} rundeseiere</div>
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
