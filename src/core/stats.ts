import { QUESTIONS, BY_ID } from '../data/questions';
import { MODULES, LEVEL_NAMES } from '../data/modules';
import type { AppState } from './state';
import { addDays } from './dates';
import { EXAM_QUESTIONS } from './exam';

export interface Agg {
  total: number; // pytań w grupie
  seen: number; // ile pytań widziano
  mastered: number;
  attempts: number; // odpowiedzi
  correct: number;
}

function emptyAgg(): Agg {
  return { total: 0, seen: 0, mastered: 0, attempts: 0, correct: 0 };
}

function add(a: Agg, s: AppState, id: string) {
  a.total++;
  const st = s.q[id];
  if (!st) return;
  if (st.seen > 0) a.seen++;
  if (st.mastered) a.mastered++;
  a.attempts += st.correct + st.wrong;
  a.correct += st.correct;
}

export const acc = (a: Agg) => (a.attempts ? a.correct / a.attempts : null);
export const masteryPct = (a: Agg) => (a.total ? a.mastered / a.total : 0);
/** Skuteczność wygładzona priorytem 50% (siła 4 odpowiedzi). */
export const smoothAcc = (a: Agg) => (a.correct + 2) / (a.attempts + 4);

export function overall(s: AppState): Agg {
  const a = emptyAgg();
  for (const q of QUESTIONS) add(a, s, q.id);
  return a;
}

export function byModule(s: AppState): Agg[] {
  const res = MODULES.map(emptyAgg);
  for (const q of QUESTIONS) add(res[q.mod], s, q.id);
  return res;
}

export function byLevel(s: AppState): { name: string; agg: Agg }[] {
  const res = LEVEL_NAMES.map(() => emptyAgg());
  for (const q of QUESTIONS) add(res[q.level], s, q.id);
  return res.map((agg, i) => ({ name: LEVEL_NAMES[i], agg }));
}

export interface TopicAgg {
  key: string;
  mod: number;
  name: string;
  agg: Agg;
}

/** Tematy (podkategorie); moduły bez podziału traktowane jako jeden temat. */
export function byTopic(s: AppState): TopicAgg[] {
  const map = new Map<string, TopicAgg>();
  for (const q of QUESTIONS) {
    const name = q.topic ?? MODULES[q.mod].short;
    const key = `${q.mod}|${name}`;
    let t = map.get(key);
    if (!t) {
      t = { key, mod: q.mod, name, agg: emptyAgg() };
      map.set(key, t);
    }
    add(t.agg, s, q.id);
  }
  return [...map.values()];
}

/** Prognoza wyniku egzaminu: suma wag modułów × wygładzona skuteczność. */
export function predictExam(s: AppState): { score: number; confident: boolean } {
  const mods = byModule(s);
  let score = 0;
  let attempts = 0;
  MODULES.forEach((m, i) => {
    score += m.weight * smoothAcc(mods[i]);
    attempts += mods[i].attempts;
  });
  return { score: Math.round(score * (EXAM_QUESTIONS / 40)), confident: attempts >= 30 };
}

export function dailySeries(s: AppState, today: string, days: number) {
  const out: { day: string; a: number; c: number; xp: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const d = s.days[day];
    out.push({ day, a: d?.a ?? 0, c: d?.c ?? 0, xp: d?.xp ?? 0 });
  }
  return out;
}

export function avgAnswerMs(s: AppState): number | null {
  let t = 0;
  let n = 0;
  for (const st of Object.values(s.q)) {
    t += st.timeMs;
    n += st.timed;
  }
  return n ? t / n : null;
}

export function mostMissed(s: AppState, limit = 8) {
  return Object.entries(s.q)
    .filter(([id, st]) => st.wrong > 0 && BY_ID.has(id))
    .sort((a, b) => b[1].wrong - a[1].wrong || a[1].correct - b[1].correct)
    .slice(0, limit)
    .map(([id, st]) => ({ q: BY_ID.get(id)!, wrong: st.wrong, correct: st.correct, mastered: st.mastered }));
}

/** Priorytet nauki modułu: duża waga na egzaminie × mało opanowane × słaba skuteczność. */
export function focusAreas(s: AppState, limit = 3) {
  const mods = byModule(s);
  return MODULES.map((m, i) => {
    const a = mods[i];
    const p = (m.weight / 40) * (1 - masteryPct(a)) * (1.5 - smoothAcc(a));
    return { mod: i, agg: a, priority: p };
  })
    .filter((x) => masteryPct(x.agg) < 1)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

export type Tone = 'bad' | 'good' | 'info' | 'warn';
export interface Recommendation {
  tone: Tone;
  title: string;
  text: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function recommendations(s: AppState): Recommendation[] {
  const recs: Recommendation[] = [];
  const mods = byModule(s);
  const all = overall(s);
  if (all.attempts < 10) {
    recs.push({ tone: 'info', title: 'Zbieram dane', text: 'Odpowiedz na co najmniej 10 pytań, a pokażę, co idzie Ci dobrze, a co trzeba poprawić.' });
    return recs;
  }

  const weak = MODULES.map((m, i) => ({ m, i, a: mods[i], acc: acc(mods[i]) }))
    .filter((x) => x.a.attempts >= 5 && x.acc !== null && x.acc < 0.65)
    .sort((a, b) => b.m.weight * (1 - b.acc!) - a.m.weight * (1 - a.acc!));
  for (const w of weak.slice(0, 3)) {
    recs.push({
      tone: 'bad',
      title: `${w.m.short}: ${pct(w.acc!)} trafień`,
      text: `${w.a.attempts} odpowiedzi, opanowane ${w.a.mastered}/${w.a.total} — priorytet.`,
    });
  }

  const topics = byTopic(s)
    .filter((t) => t.agg.attempts >= 4 && (acc(t.agg) ?? 1) < 0.5 && t.agg.total > 1)
    .sort((a, b) => (acc(a.agg) ?? 0) - (acc(b.agg) ?? 0));
  for (const t of topics.slice(0, 2)) {
    recs.push({
      tone: 'warn',
      title: `Temat: ${t.name}`,
      text: `${MODULES[t.mod].short} · ${pct(acc(t.agg)!)} trafień w ${t.agg.attempts} próbach. Przeczytaj wyjaśnienia w przeglądarce pytań.`,
    });
  }

  const unexplored = MODULES.map((m, i) => ({ m, a: mods[i] }))
    .filter((x) => x.a.total - x.a.seen > 0 && x.a.seen / x.a.total < 0.5)
    .sort((a, b) => b.m.weight - a.m.weight);
  for (const u of unexplored.slice(0, 2)) {
    recs.push({
      tone: 'info',
      title: `Nieodkryte: ${u.m.short}`,
      text: `Nie widziałeś jeszcze ${u.a.total - u.a.seen} z ${u.a.total} pytań. Spróbuj sesji z tego działu.`,
    });
  }

  const lv = byLevel(s);
  const basic = acc(lv[0].agg);
  const adv = acc(lv[2].agg);
  if (basic !== null && adv !== null && lv[2].agg.attempts >= 5 && basic - adv > 0.2) {
    recs.push({
      tone: 'warn',
      title: 'Pytania zaawansowane',
      text: `Podstawowe: ${pct(basic)}, zaawansowane: ${pct(adv)}. Różnica jest duża, więc warto poświęcić czas na trudniejsze zagadnienia.`,
    });
  }

  const backlog = QUESTIONS.filter((q) => {
    const st = s.q[q.id];
    return st && st.wrong > 0 && !st.mastered;
  }).length;
  if (backlog >= 5) {
    recs.push({ tone: 'warn', title: `${backlog} pytań do poprawy`, text: 'Uruchom „Powtórkę błędów”, żeby je domknąć.' });
  }

  const strong = MODULES.map((m, i) => ({ m, a: mods[i], acc: acc(mods[i]) }))
    .filter((x) => x.a.attempts >= 8 && (x.acc ?? 0) >= 0.85)
    .sort((a, b) => (b.acc ?? 0) - (a.acc ?? 0));
  for (const st of strong.slice(0, 2)) {
    recs.push({ tone: 'good', title: `Mocna strona: ${st.m.short}`, text: `${pct(st.acc!)} trafień w ${st.a.attempts} odpowiedziach.` });
  }

  if (s.exams.length === 0 && all.attempts >= 60) {
    recs.push({ tone: 'info', title: 'Czas na egzamin próbny', text: 'Masz już sporo odpowiedzi — sprawdź się w warunkach egzaminu (40 pytań, 40 minut).' });
  }
  if (recs.length === 0) {
    recs.push({ tone: 'good', title: 'Równa forma', text: 'Nie widzę wyraźnie słabych obszarów. Utrzymuj streak i rób egzaminy próbne.' });
  }
  return recs;
}
