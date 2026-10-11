import type { AppState } from './state';
import { addDays, daysBetween } from './dates';

export const MAX_FREEZES = 2;

/**
 * Wywoływane przy starcie i przed każdą aktualizacją streaka.
 * Opuszczone dni między ostatnim zaliczonym a dziś są pokrywane zamrożeniami;
 * jeśli zamrożeń brakuje — streak się zeruje.
 */
export function reconcileStreak(s: AppState, today: string): void {
  const st = s.streak;
  if (!st.lastDay || st.current === 0) return;
  const missed = daysBetween(st.lastDay, today) - 1;
  if (missed <= 0) return;
  if (missed <= st.freezes) {
    for (let i = 1; i <= missed; i++) st.frozenDays.push(addDays(st.lastDay, i));
    st.freezes -= missed;
    st.lastDay = addDays(today, -1);
    if (st.frozenDays.length > 60) st.frozenDays = st.frozenDays.slice(-60);
  } else {
    st.current = 0;
  }
}

/** Sprawdza, czy dziś osiągnięto cel; jeśli tak (pierwszy raz dziś) — zalicza dzień. Zwraca true przy zaliczeniu. */
export function checkGoal(s: AppState, today: string): boolean {
  const goal = s.profile?.goal ?? 20;
  const st = s.streak;
  if (st.lastDay === today) return false;
  const answered = s.days[today]?.a ?? 0;
  if (answered < goal) return false;
  reconcileStreak(s, today);
  if (st.current > 0 && st.lastDay && daysBetween(st.lastDay, today) === 1) st.current += 1;
  else st.current = 1;
  st.lastDay = today;
  if (st.current > st.best) st.best = st.current;
  if (st.current % 7 === 0 && st.freezes < MAX_FREEZES) st.freezes += 1;
  return true;
}

/** Streak do wyświetlenia (bez mutacji). */
export function displayStreak(s: AppState, today: string): { days: number; doneToday: boolean; atRisk: boolean } {
  const st = s.streak;
  if (!st.lastDay || st.current === 0) return { days: 0, doneToday: false, atRisk: false };
  const gap = daysBetween(st.lastDay, today);
  if (gap === 0) return { days: st.current, doneToday: true, atRisk: false };
  if (gap === 1) return { days: st.current, doneToday: false, atRisk: true };
  if (gap - 1 <= st.freezes) return { days: st.current, doneToday: false, atRisk: true };
  return { days: 0, doneToday: false, atRisk: false };
}
