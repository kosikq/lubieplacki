import { QUESTIONS, BY_ID } from '../data/questions';
import { MODULES } from '../data/modules';
import { type ActiveExam, type AppState, type ExamRecord, stat } from './state';
import { type Rng, defaultRng, fiftyFifty, shuffle } from './rng';
import { dayKey } from './dates';
import { checkGoal } from './streak';
import { XP } from './xp';

export const EXAM_QUESTIONS = 40;
export const EXAM_DURATION_MS = 40 * 60_000;
export const EXAM_PASS = 25;
export const EXAM_LIFELINES = 3;
export const EXAM_HISTORY_MAX = 50;

/**
 * 40 unikalnych pytań, z każdego modułu tyle, ile wynosi jego waga.
 * Najpierw pytania, które jeszcze nie padły na egzaminie, potem te używane najrzadziej
 * i najdawniej — dzięki temu ok. 6 kolejnych egzaminów nie powtarza żadnego pytania.
 */
export function drawExam(rng: Rng = defaultRng, use: AppState['examUse'] = {}): string[] {
  const ids: string[] = [];
  MODULES.forEach((m, i) => {
    const pool = shuffle(QUESTIONS.filter((q) => q.mod === i), rng).sort((a, b) => {
      const ua = use[a.id];
      const ub = use[b.id];
      return (ua?.count ?? 0) - (ub?.count ?? 0) || (ua?.last ?? 0) - (ub?.last ?? 0);
    });
    ids.push(...pool.slice(0, m.weight).map((q) => q.id));
  });
  return shuffle(ids, rng);
}

export function startExam(s: AppState, now = Date.now(), rng: Rng = defaultRng): ActiveExam {
  const ids = drawExam(rng, s.examUse);
  s.examDraws += 1;
  for (const id of ids) {
    const u = (s.examUse[id] ??= { count: 0, last: 0 });
    u.count++;
    u.last = s.examDraws;
  }
  s.activeExam = {
    ids,
    answers: ids.map(() => null),
    flags: ids.map(() => false),
    removed: ids.map(() => []),
    lifelines: EXAM_LIFELINES,
    startedAt: now,
    durationMs: EXAM_DURATION_MS,
    current: 0,
  };
  return s.activeExam;
}

export function remainingMs(ex: ActiveExam, now = Date.now()): number {
  return Math.max(0, ex.startedAt + ex.durationMs - now);
}

export function examLifeline(ex: ActiveExam, idx: number, rng: Rng = defaultRng): boolean {
  if (ex.lifelines <= 0 || ex.removed[idx].length) return false;
  const q = BY_ID.get(ex.ids[idx])!;
  ex.removed[idx] = fiftyFifty(q.correct, rng);
  ex.lifelines--;
  if (ex.answers[idx] !== null && ex.removed[idx].includes(ex.answers[idx]!)) ex.answers[idx] = null;
  return true;
}

export function submitExam(s: AppState, timedOut: boolean, now = Date.now()): ExamRecord | null {
  const ex = s.activeExam;
  if (!ex) return null;
  let score = 0;
  let answered = 0;
  let correctN = 0;
  ex.ids.forEach((id, i) => {
    const a = ex.answers[i];
    const q = BY_ID.get(id)!;
    if (a === null) return;
    answered++;
    const st = stat(s, id);
    st.seen++;
    if (a === q.correct) {
      score++;
      correctN++;
      st.correct++;
    } else {
      st.wrong++;
      // błąd na egzaminie cofa opanowanie — pytanie trafia do powtórki błędów
      st.mastered = false;
      st.streak = 0;
    }
  });
  const record: ExamRecord = {
    at: now,
    score,
    total: ex.ids.length,
    durationMs: Math.min(ex.durationMs, now - ex.startedAt),
    timedOut,
    lifelinesUsed: EXAM_LIFELINES - ex.lifelines,
    ids: ex.ids.slice(),
    answers: ex.answers.slice(),
  };
  s.exams.push(record);
  if (s.exams.length > EXAM_HISTORY_MAX) s.exams = s.exams.slice(-EXAM_HISTORY_MAX);
  s.activeExam = null;

  const xp = score * XP.examPerPoint + (score >= EXAM_PASS ? XP.examPass : 0);
  s.xp += xp;
  const today = dayKey(new Date(now));
  const d = (s.days[today] ??= { a: 0, c: 0, xp: 0 });
  d.a += answered;
  d.c += correctN;
  d.xp += xp;
  checkGoal(s, today);
  return record;
}

export function perModuleScore(rec: ExamRecord): { mod: number; correct: number; total: number }[] {
  const res = MODULES.map((_, mod) => ({ mod, correct: 0, total: 0 }));
  rec.ids.forEach((id, i) => {
    const q = BY_ID.get(id);
    if (!q) return;
    res[q.mod].total++;
    if (rec.answers[i] === q.correct) res[q.mod].correct++;
  });
  return res.filter((r) => r.total > 0);
}
