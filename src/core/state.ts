// Model całego stanu aplikacji (zapisywany w localStorage jako jeden obiekt).

export interface QStat {
  seen: number; // ile razy pytanie padło (nauka + egzamin)
  correct: number;
  wrong: number;
  streak: number; // poprawne z rzędu w RÓŻNYCH sesjach nauki (do opanowania)
  lastCorrectSession: number; // id sesji ostatniej poprawnej odp. liczonej do opanowania
  lastSeen: number; // wartość globalnego licznika `n` przy ostatniej odpowiedzi w nauce
  mastered: boolean;
  timeMs: number; // suma czasu odpowiedzi (nauka)
  timed: number; // liczba odpowiedzi z zarejestrowanym czasem
}

export interface DayLog {
  a: number; // odpowiedzi
  c: number; // poprawne
  xp: number;
}

export interface ExamRecord {
  at: number; // timestamp zakończenia
  score: number;
  total: number;
  durationMs: number;
  timedOut: boolean;
  lifelinesUsed: number;
  ids: string[];
  answers: (number | null)[];
}

export interface ActiveExam {
  ids: string[];
  answers: (number | null)[];
  flags: boolean[];
  removed: number[][]; // opcje wykluczone kołem 50/50, per pytanie
  lifelines: number;
  startedAt: number;
  durationMs: number;
  current: number;
}

export interface Totals {
  answered: number; // tylko nauka
  correct: number;
  run: number; // bieżąca seria poprawnych (nauka)
  bestRun: number;
  noHelpRun: number;
  bestNoHelpRun: number;
  sessions: number;
  perfectSessions: number;
  earlyBird: number; // odpowiedzi przed 7:00
  nightOwl: number; // odpowiedzi po 23:00
  mistakesFixed: number; // poprawne odp. na pytania z powtórki błędu
}

export interface AppState {
  v: number;
  profile: { name: string; goal: number; createdAt: number } | null;
  settings: { theme: 'system' | 'light' | 'dark'; sound: boolean; installHintDismissed: boolean };
  n: number; // globalny licznik odpowiedzi w nauce (zegar algorytmu powtórek)
  sessionCounter: number;
  q: Record<string, QStat>;
  retry: { id: string; due: number }[];
  recent: string[]; // ostatnio zadane w nauce (najnowsze na końcu)
  days: Record<string, DayLog>; // klucz: YYYY-MM-DD (czas lokalny)
  streak: { current: number; best: number; lastDay: string | null; freezes: number; frozenDays: string[] };
  xp: number;
  totals: Totals;
  lifelineCooldown: number; // 50/50 w nauce: ile pytań do odnowienia
  exams: ExamRecord[];
  activeExam: ActiveExam | null;
  achievements: Record<string, number>; // id -> kiedy odblokowano
}

export const SCHEMA_VERSION = 1;
export const RECENT_MAX = 60;

export function emptyStat(): QStat {
  return { seen: 0, correct: 0, wrong: 0, streak: 0, lastCorrectSession: -1, lastSeen: -1, mastered: false, timeMs: 0, timed: 0 };
}

export function defaultState(): AppState {
  return {
    v: SCHEMA_VERSION,
    profile: null,
    settings: { theme: 'system', sound: true, installHintDismissed: false },
    n: 0,
    sessionCounter: 0,
    q: {},
    retry: [],
    recent: [],
    days: {},
    streak: { current: 0, best: 0, lastDay: null, freezes: 0, frozenDays: [] },
    xp: 0,
    totals: {
      answered: 0, correct: 0, run: 0, bestRun: 0, noHelpRun: 0, bestNoHelpRun: 0,
      sessions: 0, perfectSessions: 0, earlyBird: 0, nightOwl: 0, mistakesFixed: 0,
    },
    lifelineCooldown: 0,
    exams: [],
    activeExam: null,
    achievements: {},
  };
}

export function stat(s: AppState, id: string): QStat {
  let st = s.q[id];
  if (!st) {
    st = emptyStat();
    s.q[id] = st;
  }
  return st;
}

export function peekStat(s: AppState, id: string): QStat | undefined {
  return s.q[id];
}

/** Uzupełnia brakujące pola (np. po aktualizacji aplikacji) i migruje stare wersje schematu. */
export function migrate(input: unknown): AppState {
  const base = defaultState();
  if (!input || typeof input !== 'object') return base;
  const s = input as Partial<AppState>;
  // przyszłe migracje: if ((s.v ?? 0) < 2) { ... }
  const merged: AppState = {
    ...base,
    ...s,
    settings: { ...base.settings, ...(s.settings || {}) },
    streak: { ...base.streak, ...(s.streak || {}) },
    totals: { ...base.totals, ...(s.totals || {}) },
    q: s.q && typeof s.q === 'object' ? s.q : {},
    retry: Array.isArray(s.retry) ? s.retry : [],
    recent: Array.isArray(s.recent) ? s.recent : [],
    days: s.days && typeof s.days === 'object' ? s.days : {},
    exams: Array.isArray(s.exams) ? s.exams : [],
    achievements: s.achievements && typeof s.achievements === 'object' ? s.achievements : {},
    v: SCHEMA_VERSION,
  };
  for (const id of Object.keys(merged.q)) merged.q[id] = { ...emptyStat(), ...merged.q[id] };
  return merged;
}
