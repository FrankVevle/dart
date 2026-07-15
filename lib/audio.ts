// Synthesized sound effects (Web Audio API, no external audio files) plus spoken
// announcements (Speech Synthesis API). Both only ever run from a click handler, so
// they satisfy browsers' "needs a user gesture" autoplay policy for free.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

interface ToneStep {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playTones(steps: ToneStep[]): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const step of steps) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = step.type ?? 'sine';
    osc.frequency.setValueAtTime(step.freq, now + step.start);
    const peak = step.gain ?? 0.2;
    gainNode.gain.setValueAtTime(0.0001, now + step.start);
    gainNode.gain.exponentialRampToValueAtTime(peak, now + step.start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + step.start + step.duration);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now + step.start);
    osc.stop(now + step.start + step.duration + 0.02);
  }
}

export function playMissSound(): void {
  playTones([{ freq: 160, start: 0, duration: 0.18, type: 'sine', gain: 0.15 }]);
}

export function playBustSound(): void {
  playTones([
    { freq: 200, start: 0, duration: 0.22, type: 'sawtooth', gain: 0.22 },
    { freq: 140, start: 0.15, duration: 0.28, type: 'sawtooth', gain: 0.22 }
  ]);
}

export function playBullseyeSound(): void {
  playTones([
    { freq: 660, start: 0, duration: 0.12, type: 'triangle', gain: 0.2 },
    { freq: 990, start: 0.1, duration: 0.2, type: 'triangle', gain: 0.2 }
  ]);
}

export function playFanfareSound(): void {
  playTones([
    { freq: 523.25, start: 0, duration: 0.16, type: 'square', gain: 0.18 },
    { freq: 659.25, start: 0.14, duration: 0.16, type: 'square', gain: 0.18 },
    { freq: 783.99, start: 0.28, duration: 0.16, type: 'square', gain: 0.18 },
    { freq: 1046.5, start: 0.42, duration: 0.35, type: 'square', gain: 0.2 }
  ]);
}

// Spoken announcements always use English — these are the real, internationally
// recognized darts caller terms ("BUST", "BULLSEYE", "GAME SHOT") regardless of the
// app's Norwegian UI language.
export function announce(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
