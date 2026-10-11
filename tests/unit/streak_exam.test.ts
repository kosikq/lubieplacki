import { describe, expect, it } from 'vitest';
import { defaultState, migrate, type AppState } from '../../src/core/state';
import { checkGoal, displayStreak, reconcileStreak } from '../../src/core/streak';
import { addDays, daysBetween, dayKey } from '../../src/core/dates';
import { drawExam, examLifeline, remainingMs, startExam, submitExam, EXAM_DURATION_MS, perModuleScore } from '../../src/core/exam';
import { BY_ID, QUESTIONS } from '../../src/data/questions';
import { MODULES } from '../../src/data/modules';
import { seeded } from '../../src/core/rng';
import { levelInfo, xpForLevel } from '../../src/core/xp';
import { unlockAchievements } from '../../src/core/achievements';
import { predictExam, recommendations } from '../../src/core/stats';

function fresh(goal = 10): AppState {
  const s = defaultState();
  s.profile = { name: 'T', goal, createdAt: 0 };
  return s;
}
function study(s: AppState, day: string, n: number) {
  s.days[day] = { a: (s.days[day]?.a ?? 0) + n, c: 0, xp: 0 };
  return checkGoal(s, day);
}

describe('daty', () => {
  it('zmiana czasu nie psuje różnicy dni', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // DST w Polsce 29.03
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('streak', () => {
  it('rośnie dzień po dniu po osiągnięciu celu', () => {
    const s = fresh(10);
    expect(study(s, '2026-10-01', 5)).toBe(false);
    expect(s.streak.current).toBe(0);
    expect(study(s, '2026-10-01', 5)).toBe(true);
    expect(study(s, '2026-10-01', 5)).toBe(false); // drugi raz tego dnia nie liczy
    study(s, '2026-10-02', 10);
    study(s, '2026-10-03', 12);
    expect(s.streak.current).toBe(3);
    expect(displayStreak(s, '2026-10-03')).toEqual({ days: 3, doneToday: true, atRisk: false });
    expect(displayStreak(s, '2026-10-04').atRisk).toBe(true);
    expect(displayStreak(s, '2026-10-05').days).toBe(0);
  });

  it('przerwa bez zamrożeń zeruje streak', () => {
    const s = fresh(10);
    study(s, '2026-10-01', 10);
    study(s, '2026-10-02', 10);
    study(s, '2026-10-05', 10);
    expect(s.streak.current).toBe(1);
    expect(s.streak.best).toBe(2);
  });

  it('7 dni daje zamrożenie, które ratuje 1 opuszczony dzień', () => {
    const s = fresh(10);
    for (let i = 0; i < 7; i++) study(s, addDays('2026-10-01', i), 10);
    expect(s.streak.current).toBe(7);
    expect(s.streak.freezes).toBe(1);
    // 2026-10-08 opuszczony
    reconcileStreak(s, '2026-10-09');
    expect(s.streak.freezes).toBe(0);
    expect(s.streak.frozenDays).toContain('2026-10-08');
    study(s, '2026-10-09', 10);
    expect(s.streak.current).toBe(8);
  });

  it('za długa przerwa mimo zamrożenia zeruje', () => {
    const s = fresh(10);
    for (let i = 0; i < 7; i++) study(s, addDays('2026-10-01', i), 10);
    study(s, '2026-10-11', 10); // 3 dni przerwy, 1 zamrożenie
    expect(s.streak.current).toBe(1);
  });

  it('zamrożeń max 2', () => {
    const s = fresh(10);
    for (let i = 0; i < 28; i++) study(s, addDays('2026-01-01', i), 10);
    expect(s.streak.freezes).toBe(2);
  });
});

describe('egzamin', () => {
  it('40 unikalnych pytań zgodnie z wagami modułów', () => {
    for (let seed = 1; seed < 50; seed++) {
      const ids = drawExam(seeded(seed));
      expect(ids.length).toBe(40);
      expect(new Set(ids).size).toBe(40);
      MODULES.forEach((m, i) => expect(ids.filter((id) => BY_ID.get(id)!.mod === i).length).toBe(m.weight));
    }
  });

  it('timer liczony z czasu startu, 50/50 max 3, wynik i statystyki', () => {
    const s = fresh(10);
    const t0 = new Date(2026, 9, 11, 10).getTime();
    const ex = startExam(s, t0, seeded(1));
    expect(remainingMs(ex, t0 + 60_000)).toBe(EXAM_DURATION_MS - 60_000);
    expect(remainingMs(ex, t0 + EXAM_DURATION_MS + 5000)).toBe(0);
    const rng = seeded(2);
    expect(examLifeline(ex, 0, rng)).toBe(true);
    expect(examLifeline(ex, 0, rng)).toBe(false); // to samo pytanie drugi raz
    expect(ex.removed[0]).not.toContain(BY_ID.get(ex.ids[0])!.correct);
    expect(examLifeline(ex, 1, rng)).toBe(true);
    expect(examLifeline(ex, 2, rng)).toBe(true);
    expect(examLifeline(ex, 3, rng)).toBe(false);
    // 30 poprawnych, 5 błędnych, 5 bez odpowiedzi
    ex.ids.forEach((id, i) => {
      const c = BY_ID.get(id)!.correct;
      ex.answers[i] = i < 30 ? c : i < 35 ? (c + 1) % 4 : null;
    });
    const rec = submitExam(s, false, t0 + 20 * 60_000)!;
    expect(rec.score).toBe(30);
    expect(rec.lifelinesUsed).toBe(3);
    expect(rec.durationMs).toBe(20 * 60_000);
    expect(s.activeExam).toBeNull();
    expect(s.days['2026-10-11'].a).toBe(35);
    expect(s.streak.current).toBe(1); // 35 >= cel 10
    expect(perModuleScore(rec).reduce((a, r) => a + r.total, 0)).toBe(40);
    const wrongId = ex.ids[31];
    expect(s.q[wrongId].wrong).toBe(1);
    expect(s.q[ex.ids[36]]).toBeUndefined();
  });

  it('50/50 kasuje odpowiedź, jeśli była na wykluczonej opcji', () => {
    const s = fresh();
    const ex = startExam(s, 0, seeded(3));
    const c = BY_ID.get(ex.ids[0])!.correct;
    const rng = seeded(4);
    // ustaw odpowiedź na którąś błędną i użyj 50/50 aż trafi na wykluczoną
    ex.answers[0] = (c + 1) % 4;
    examLifeline(ex, 0, rng);
    if (ex.removed[0].includes((c + 1) % 4)) expect(ex.answers[0]).toBeNull();
    else expect(ex.answers[0]).toBe((c + 1) % 4);
  });
});

describe('xp i poziomy', () => {
  it('progi rosną, levelInfo spójne', () => {
    expect(xpForLevel(1)).toBe(0);
    for (let l = 1; l < 30; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    for (const xp of [0, 79, 80, 199, 200, 5000]) {
      const li = levelInfo(xp);
      expect(li.into).toBeGreaterThanOrEqual(0);
      expect(li.into).toBeLessThan(li.need);
    }
  });
});

describe('osiągnięcia i statystyki', () => {
  it('pusty stan nie odblokowuje niczego; po 1 odp. odblokowuje „Pierwszy krok”', () => {
    const s = fresh();
    expect(unlockAchievements(s)).toEqual([]);
    s.totals.answered = 1;
    expect(unlockAchievements(s).map((a) => a.id)).toEqual(['first']);
    expect(unlockAchievements(s)).toEqual([]);
  });
  it('prognoza egzaminu w zakresie 0–40, rekomendacje nie są puste', () => {
    const s = fresh();
    expect(predictExam(s).score).toBe(20);
    expect(recommendations(s).length).toBeGreaterThan(0);
    QUESTIONS.slice(0, 80).forEach((q, i) => {
      s.q[q.id] = { seen: 2, correct: i % 3 ? 2 : 0, wrong: i % 3 ? 0 : 2, streak: 0, lastCorrectSession: -1, lastSeen: 0, mastered: i % 3 !== 0, timeMs: 0, timed: 0 };
    });
    const p = predictExam(s);
    expect(p.score).toBeGreaterThanOrEqual(0);
    expect(p.score).toBeLessThanOrEqual(40);
    expect(recommendations(s).length).toBeGreaterThan(0);
  });
});

describe('migracja stanu', () => {
  it('uzupełnia brakujące pola i odrzuca śmieci', () => {
    expect(migrate(null).v).toBe(1);
    const m = migrate({ xp: 50, settings: { sound: false }, q: { 'CBZC-001': { seen: 3 } } });
    expect(m.xp).toBe(50);
    expect(m.settings.theme).toBe('system');
    expect(m.settings.sound).toBe(false);
    expect(m.q['CBZC-001'].mastered).toBe(false);
    expect(m.totals.bestRun).toBe(0);
  });
});
