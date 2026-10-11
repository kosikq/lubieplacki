// Globalny magazyn stanu: jedna kopia w pamięci, zapis do localStorage po każdej zmianie.
import { useEffect, useState } from 'preact/hooks';
import { type AppState, defaultState, migrate } from './state';
import { reconcileStreak } from './streak';
import { dayKey } from './dates';
import { type Achievement, unlockAchievements } from './achievements';

export const STORAGE_KEY = 'cbzc.v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw));
  } catch {
    try {
      // uszkodzone dane: zachowaj kopię do ewentualnego odzyskania, zacznij od zera
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(`${STORAGE_KEY}.corrupt.${Date.now()}`, raw);
    } catch {
      /* brak dostępu do storage */
    }
    return defaultState();
  }
}

let state: AppState = load();
let version = 0;
const listeners = new Set<() => void>();
const achListeners = new Set<(a: Achievement[]) => void>();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* pełny lub zablokowany storage — aplikacja działa dalej w pamięci */
  }
}

export function getState(): AppState {
  return state;
}

/** Mutuje stan, zapisuje i powiadamia widoki. Sprawdza też osiągnięcia. */
export function update<T>(fn: (s: AppState) => T): T {
  const result = fn(state);
  const fresh = state.profile ? unlockAchievements(state) : [];
  version++;
  save();
  listeners.forEach((l) => l());
  if (fresh.length) achListeners.forEach((l) => l(fresh));
  return result;
}

export function resetAll(keepProfile: boolean) {
  const prev = state;
  state = defaultState();
  if (keepProfile) {
    state.profile = prev.profile ? { ...prev.profile, createdAt: Date.now() } : null;
    state.settings = prev.settings;
  }
  version++;
  save();
  listeners.forEach((l) => l());
}

export function onAchievements(fn: (a: Achievement[]) => void) {
  achListeners.add(fn);
  return () => achListeners.delete(fn);
}

/** Hook: re-render przy każdej zmianie stanu. */
export function useAppState(): AppState {
  const [, setV] = useState(version);
  useEffect(() => {
    const l = () => setV(version);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return state;
}

export function initStore() {
  update((s) => reconcileStreak(s, dayKey()));
  try {
    navigator.storage?.persist?.();
  } catch {
    /* niewspierane */
  }
}

// Testy E2E: dostęp do stanu z przeglądarki (dane pytań dokłada main.tsx)
if (typeof window !== 'undefined') {
  (window as any).__cbzc = { getState, update, resetAll };
}
