import type { AppState } from './state';
import { byModule, overall } from './stats';
import { EXAM_PASS } from './exam';
import { levelInfo } from './xp';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  group: string;
  /** [postęp, cel] */
  progress: (s: AppState) => [number, number];
}

const maxModuleMastery = (s: AppState) => Math.max(...byModule(s).map((a) => (a.total ? a.mastered / a.total : 0)));
const examBest = (s: AppState) => s.exams.reduce((m, e) => Math.max(m, e.score), 0);
const pctMastered = (s: AppState) => {
  const o = overall(s);
  return Math.floor((o.mastered / o.total) * 100);
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', icon: '🎯', group: 'Nauka', title: 'Pierwszy krok', desc: 'Odpowiedz na pierwsze pytanie.', progress: (s) => [s.totals.answered, 1] },
  { id: 'a50', icon: '📗', group: 'Nauka', title: 'Rozgrzewka', desc: 'Odpowiedz na 50 pytań.', progress: (s) => [s.totals.answered, 50] },
  { id: 'a200', icon: '📘', group: 'Nauka', title: 'Pracuś', desc: 'Odpowiedz na 200 pytań.', progress: (s) => [s.totals.answered, 200] },
  { id: 'a500', icon: '📙', group: 'Nauka', title: 'Maratończyk', desc: 'Odpowiedz na 500 pytań.', progress: (s) => [s.totals.answered, 500] },
  { id: 'a1000', icon: '📚', group: 'Nauka', title: 'Tysiącznik', desc: 'Odpowiedz na 1000 pytań.', progress: (s) => [s.totals.answered, 1000] },
  { id: 'seenall', icon: '🗺️', group: 'Nauka', title: 'Cała mapa', desc: 'Zobacz wszystkie 300 pytań.', progress: (s) => [overall(s).seen, 300] },
  { id: 'perfect', icon: '💯', group: 'Nauka', title: 'Bez skazy', desc: 'Ukończ sesję bez żadnego błędu.', progress: (s) => [s.totals.perfectSessions, 1] },
  { id: 'perfect10', icon: '🏵️', group: 'Nauka', title: 'Perfekcjonista', desc: 'Ukończ 10 bezbłędnych sesji.', progress: (s) => [s.totals.perfectSessions, 10] },
  { id: 'fix10', icon: '🩹', group: 'Nauka', title: 'Uczę się na błędach', desc: 'Popraw 10 pytań, na które wcześniej odpowiedziałeś źle.', progress: (s) => [s.totals.mistakesFixed, 10] },

  { id: 'run10', icon: '⚡', group: 'Serie', title: 'Seria x10', desc: '10 poprawnych odpowiedzi z rzędu.', progress: (s) => [s.totals.bestRun, 10] },
  { id: 'run25', icon: '🌟', group: 'Serie', title: 'Seria x25', desc: '25 poprawnych odpowiedzi z rzędu.', progress: (s) => [s.totals.bestRun, 25] },
  { id: 'run50', icon: '💎', group: 'Serie', title: 'Nie do zatrzymania', desc: '50 poprawnych odpowiedzi z rzędu.', progress: (s) => [s.totals.bestRun, 50] },
  { id: 'nohelp20', icon: '🧠', group: 'Serie', title: 'Samodzielność', desc: '20 poprawnych z rzędu bez koła 50/50.', progress: (s) => [s.totals.bestNoHelpRun, 20] },

  { id: 'streak3', icon: '🔥', group: 'Streak', title: 'Rozpalony', desc: 'Streak 3 dni.', progress: (s) => [s.streak.best, 3] },
  { id: 'streak7', icon: '📅', group: 'Streak', title: 'Tydzień nauki', desc: 'Streak 7 dni.', progress: (s) => [s.streak.best, 7] },
  { id: 'streak14', icon: '🗓️', group: 'Streak', title: 'Dwa tygodnie', desc: 'Streak 14 dni.', progress: (s) => [s.streak.best, 14] },
  { id: 'streak30', icon: '🏔️', group: 'Streak', title: 'Miesiąc dyscypliny', desc: 'Streak 30 dni.', progress: (s) => [s.streak.best, 30] },
  { id: 'early', icon: '🌅', group: 'Streak', title: 'Ranny ptaszek', desc: 'Odpowiedz na 20 pytań przed 7:00.', progress: (s) => [s.totals.earlyBird, 20] },
  { id: 'night', icon: '🦉', group: 'Streak', title: 'Nocny marek', desc: 'Odpowiedz na 20 pytań po 23:00.', progress: (s) => [s.totals.nightOwl, 20] },

  { id: 'mod100', icon: '🥇', group: 'Opanowanie', title: 'Specjalista', desc: 'Opanuj w 100% dowolny dział.', progress: (s) => [Math.round(maxModuleMastery(s) * 100), 100] },
  { id: 'm25', icon: '🥉', group: 'Opanowanie', title: 'Ćwierć drogi', desc: 'Opanuj 25% materiału.', progress: (s) => [pctMastered(s), 25] },
  { id: 'm50', icon: '🥈', group: 'Opanowanie', title: 'Półmetek', desc: 'Opanuj 50% materiału.', progress: (s) => [pctMastered(s), 50] },
  { id: 'm100', icon: '👑', group: 'Opanowanie', title: 'Mistrz CBZC', desc: 'Opanuj 100% materiału.', progress: (s) => [pctMastered(s), 100] },
  { id: 'lvl10', icon: '🎖️', group: 'Opanowanie', title: 'Awans', desc: 'Osiągnij poziom 10.', progress: (s) => [levelInfo(s.xp).level, 10] },

  { id: 'exam1', icon: '📝', group: 'Egzamin', title: 'Pierwsze podejście', desc: 'Ukończ egzamin próbny.', progress: (s) => [s.exams.length, 1] },
  { id: 'exampass', icon: '✅', group: 'Egzamin', title: 'Zdane!', desc: `Zdobądź min. ${EXAM_PASS}/40 na egzaminie.`, progress: (s) => [examBest(s), EXAM_PASS] },
  { id: 'exam35', icon: '🏅', group: 'Egzamin', title: 'Prymus', desc: 'Zdobądź min. 35/40 na egzaminie.', progress: (s) => [examBest(s), 35] },
  { id: 'exam40', icon: '🏆', group: 'Egzamin', title: 'Perfekcyjny wynik', desc: 'Zdobądź 40/40 na egzaminie.', progress: (s) => [examBest(s), 40] },
  {
    id: 'examsolo', icon: '🦾', group: 'Egzamin', title: 'Bez kół ratunkowych', desc: 'Zdaj egzamin bez użycia 50/50.',
    progress: (s) => [s.exams.some((e) => e.score >= EXAM_PASS && e.lifelinesUsed === 0) ? 1 : 0, 1],
  },
  { id: 'exam5', icon: '🎓', group: 'Egzamin', title: 'Weteran', desc: 'Ukończ 5 egzaminów próbnych.', progress: (s) => [s.exams.length, 5] },
];

/** Odblokowuje spełnione osiągnięcia; zwraca nowo odblokowane. */
export function unlockAchievements(s: AppState, now = Date.now()): Achievement[] {
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    const [p, t] = a.progress(s);
    if (p >= t) {
      s.achievements[a.id] = now;
      fresh.push(a);
    }
  }
  return fresh;
}
