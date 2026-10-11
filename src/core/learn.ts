// Tryb nauki: dobór pytań (powtórki błędów co ~10 pytań, brak częstych powtórek,
// priorytet nowych i słabych pytań) oraz zapis odpowiedzi.
import { QUESTIONS, type Question } from '../data/questions';
import { MODULES } from '../data/modules';
import { type AppState, RECENT_MAX, peekStat, stat } from './state';
import { type Rng, defaultRng, weightedPick } from './rng';
import { dayKey } from './dates';
import { checkGoal } from './streak';
import { XP } from './xp';

export type LearnMode = { kind: 'mixed' } | { kind: 'module'; mod: number } | { kind: 'mistakes' };
export type PickReason = 'retry' | 'new' | 'weak' | 'confirm' | 'review';

export const SESSION_LEN = 10;
export const LIFELINE_COOLDOWN = 5;
/** Zła odpowiedź wraca jako 9.–11. kolejne pytanie. */
export const RETRY_MIN = 9;
export const RETRY_SPREAD = 3;

// new = nigdy nie widziane, weak = były błędy i nieopanowane,
// confirm = dotąd tylko poprawnie, czeka na 2. potwierdzenie, review = opanowane (utrwalanie)
const BUCKET_SHARE: Record<Exclude<PickReason, 'retry'>, number> = { new: 0.7, weak: 0.15, confirm: 0.1, review: 0.05 };
/** Pytanie raz poprawne wraca do potwierdzenia dopiero po tylu odpowiedziach. */
export const CONFIRM_GAP = 30;

export function isMistake(s: AppState, id: string): boolean {
  const st = peekStat(s, id);
  return !!st && st.wrong > 0 && !st.mastered;
}

export function poolFor(s: AppState, mode: LearnMode): Question[] {
  if (mode.kind === 'module') return QUESTIONS.filter((q) => q.mod === mode.mod);
  if (mode.kind === 'mistakes') return QUESTIONS.filter((q) => isMistake(s, q.id));
  return QUESTIONS;
}

export function sessionLength(s: AppState, mode: LearnMode): number {
  return Math.min(SESSION_LEN, poolFor(s, mode).length);
}

export function startSession(s: AppState): number {
  s.sessionCounter += 1;
  return s.sessionCounter;
}

function moduleCoverage(s: AppState): number[] {
  const seen = MODULES.map(() => 0);
  const count = MODULES.map(() => 0);
  for (const q of QUESTIONS) {
    count[q.mod]++;
    if ((peekStat(s, q.id)?.seen ?? 0) > 0) seen[q.mod]++;
  }
  return count.map((c, i) => (c ? seen[i] / c : 1));
}

/**
 * Wybiera następne pytanie z puli.
 * @param asked id pytań zadanych już w bieżącej sesji (w kolejności)
 */
export function pickNext(
  s: AppState,
  pool: Question[],
  asked: string[],
  rng: Rng = defaultRng,
  diversify = true,
): { q: Question; reason: PickReason } | null {
  if (pool.length === 0) return null;
  const inPool = new Set(pool.map((q) => q.id));
  const askedSet = new Set(asked);

  // 1) dojrzałe powtórki błędów — najstarsza pierwsza
  const due = s.retry
    .filter((r) => r.due <= s.n && inPool.has(r.id) && !askedSet.has(r.id))
    .sort((a, b) => a.due - b.due);
  if (due.length) {
    const q = pool.find((x) => x.id === due[0].id)!;
    return { q, reason: 'retry' };
  }

  // 2) kandydaci: stopniowo luzowane ograniczenia, żeby mała pula nigdy się nie zakleszczyła
  const pending = new Set(s.retry.map((r) => r.id));
  const windowSize = Math.min(40, Math.floor(pool.length * 0.5));
  const recent = new Set(windowSize > 0 ? s.recent.slice(-windowSize) : []);
  const lastId = asked[asked.length - 1] ?? s.recent[s.recent.length - 1];
  const tiers: ((q: Question) => boolean)[] = [
    (q) => !askedSet.has(q.id) && !pending.has(q.id) && !recent.has(q.id),
    (q) => !askedSet.has(q.id) && !pending.has(q.id),
    (q) => !askedSet.has(q.id),
    (q) => q.id !== lastId,
    () => true,
  ];
  let cands: Question[] = [];
  for (const t of tiers) {
    cands = pool.filter(t);
    if (cands.length) break;
  }

  // 3) kubełki: nowe / słabe / opanowane
  const buckets: Record<Exclude<PickReason, 'retry'>, Question[]> = { new: [], weak: [], confirm: [], review: [] };
  const confirmGap = Math.min(CONFIRM_GAP, Math.floor(pool.length * 0.5));
  const deferred: Question[] = []; // potwierdzenia, które jeszcze nie dojrzały
  for (const q of cands) {
    const st = peekStat(s, q.id);
    if (!st || st.seen === 0) buckets.new.push(q);
    else if (st.mastered) buckets.review.push(q);
    else if (st.wrong > 0) buckets.weak.push(q);
    else if (st.lastSeen < 0 || s.n - st.lastSeen >= confirmGap) buckets.confirm.push(q);
    else deferred.push(q);
  }
  if (!buckets.new.length && !buckets.weak.length && !buckets.confirm.length && !buckets.review.length) buckets.confirm = deferred;
  const kinds = (Object.keys(buckets) as (keyof typeof buckets)[]).filter((k) => buckets[k].length);
  const kind = weightedPick(kinds, (k) => BUCKET_SHARE[k], rng);
  let list = buckets[kind];

  // 4) różnorodność działów: nie dwa razy z rzędu ten sam moduł (jeśli się da)
  if (diversify && lastId) {
    const lastMod = QUESTIONS.find((q) => q.id === lastId)?.mod;
    const other = list.filter((q) => q.mod !== lastMod);
    if (other.length) list = other;
  }

  let weight: (q: Question) => number;
  if (kind === 'new') {
    const cov = moduleCoverage(s);
    weight = (q) => 1 + 2 * (1 - cov[q.mod]);
  } else if (kind === 'weak' || kind === 'confirm') {
    weight = (q) => {
      const st = peekStat(s, q.id)!;
      const acc = (st.correct + 1) / (st.seen + 2);
      return 0.5 + 2 * (1 - acc) + Math.min(1, (s.n - st.lastSeen) / 50);
    };
  } else {
    weight = (q) => 1 + Math.max(0, s.n - peekStat(s, q.id)!.lastSeen) / 30;
  }
  return { q: weightedPick(list, weight, rng), reason: kind };
}

export interface AnswerResult {
  correct: boolean;
  newlyMastered: boolean;
  goalReached: boolean;
  xp: number;
}

export interface AnswerOpts {
  sessionId: number;
  helped: boolean; // użyto 50/50 przy tym pytaniu
  timeMs: number;
  reason: PickReason;
  now?: Date;
  rng?: Rng;
}

export function recordAnswer(s: AppState, q: Question, chosen: number, o: AnswerOpts): AnswerResult {
  const now = o.now ?? new Date();
  const rng = o.rng ?? defaultRng;
  const correct = chosen === q.correct;
  const st = stat(s, q.id);
  const wasMistake = st.wrong > 0 && !st.mastered;

  st.seen++;
  if (correct) st.correct++;
  else st.wrong++;
  st.lastSeen = s.n;
  s.n++;
  if (o.timeMs > 0 && o.timeMs < 5 * 60_000) {
    st.timeMs += o.timeMs;
    st.timed++;
  }

  // powtórka błędu za ~10 pytań
  s.retry = s.retry.filter((r) => r.id !== q.id);
  if (!correct) s.retry.push({ id: q.id, due: s.n + (RETRY_MIN - 1) + Math.floor(rng() * RETRY_SPREAD) });

  // opanowanie: 2 poprawne z rzędu w różnych sesjach, bez koła ratunkowego
  let newlyMastered = false;
  if (correct && !o.helped) {
    if (st.lastCorrectSession !== o.sessionId) {
      st.streak++;
      st.lastCorrectSession = o.sessionId;
      if (st.streak >= 2 && !st.mastered) {
        st.mastered = true;
        newlyMastered = true;
      }
    }
  } else if (!correct) {
    st.streak = 0;
    st.mastered = false;
  }

  const t = s.totals;
  t.answered++;
  if (correct) {
    t.correct++;
    t.run++;
    if (t.run > t.bestRun) t.bestRun = t.run;
    if (o.helped) t.noHelpRun = 0;
    else {
      t.noHelpRun++;
      if (t.noHelpRun > t.bestNoHelpRun) t.bestNoHelpRun = t.noHelpRun;
    }
    if (wasMistake) t.mistakesFixed++;
  } else {
    t.run = 0;
    t.noHelpRun = 0;
  }
  const hour = now.getHours();
  if (hour < 7 && hour >= 4) t.earlyBird++;
  if (hour >= 23 || hour < 4) t.nightOwl++;

  if (!o.helped && s.lifelineCooldown > 0) s.lifelineCooldown--;

  const xp = correct ? (o.helped ? XP.correctHelped : XP.correct) : XP.wrong;
  s.xp += xp;
  const today = dayKey(now);
  const d = (s.days[today] ??= { a: 0, c: 0, xp: 0 });
  d.a++;
  if (correct) d.c++;
  d.xp += xp;

  s.recent.push(q.id);
  if (s.recent.length > RECENT_MAX) s.recent = s.recent.slice(-RECENT_MAX);

  const goalReached = checkGoal(s, today);
  return { correct, newlyMastered, goalReached, xp };
}

export function takeLifeline(s: AppState): boolean {
  if (s.lifelineCooldown > 0) return false;
  s.lifelineCooldown = LIFELINE_COOLDOWN;
  return true;
}

/** Bonus za ukończenie sesji. Zwraca zdobyte XP. */
export function finishSession(s: AppState, correct: number, total: number, now: Date = new Date()): number {
  if (total === 0) return 0;
  s.totals.sessions++;
  let xp = XP.sessionDone;
  if (correct === total && total >= 5) {
    s.totals.perfectSessions++;
    xp += XP.perfectSession;
  }
  s.xp += xp;
  const d = (s.days[dayKey(now)] ??= { a: 0, c: 0, xp: 0 });
  d.xp += xp;
  return xp;
}
