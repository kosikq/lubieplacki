// Krótkie dźwięki generowane w Web Audio (bez plików audio).
import { getState } from './store';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** iOS wymaga uruchomienia kontekstu audio w geście użytkownika. */
export function unlockAudio() {
  const c = audio();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playCorrect() {
  if (!getState().settings.sound) return;
  unlockAudio();
  tone(659.25, 0, 0.14, 'sine', 0.22);
  tone(987.77, 0.09, 0.22, 'sine', 0.2);
}

export function playWrong() {
  if (!getState().settings.sound) return;
  unlockAudio();
  tone(233.08, 0, 0.18, 'triangle', 0.25);
  tone(174.61, 0.13, 0.28, 'triangle', 0.22);
}

export function playSuccess() {
  if (!getState().settings.sound) return;
  unlockAudio();
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.25, 'sine', 0.16));
}
