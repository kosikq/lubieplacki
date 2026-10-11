import { describe, expect, it } from 'vitest';
import { defaultState, type AppState } from '../../src/core/state';
import {
  pickNext, poolFor, recordAnswer, startSession, sessionLength, finishSession, takeLifeline,
  type LearnMode, SESSION_LEN,
} from '../../src/core/learn';
import { QUESTIONS } from '../../src/data/questions';
import { MODULES } from '../../src/data/modules';
import { seeded } from '../../src/core/rng';

function fresh(): AppState {
  const s = defaultState();
  s.profile = { name: 'Test', goal: 20, createdAt: 0 };
  return s;
}

/** Symuluje sesję; `answer(q)` zwraca wybraną opcję. */
function runSession(s: AppState, mode: LearnMode, rng: () => number, answer: (q: (typeof QUESTIONS)[number], i: number) => number, log?: string[]) {
  const sid = startSession(s);
  const pool = poolFor(s, mode);
  const len = sessionLength(s, mode);
  const asked: string[] = [];
  let correct = 0;
  for (let i = 0; i < len; i++) {
    const pick = pickNext(s, pool, asked, rng, mode.kind === 'mixed')!;
    expect(pick).toBeTruthy();
    asked.push(pick.q.id);
    log?.push(pick.q.id);
    const r = recordAnswer(s, pick.q, answer(pick.q, i), { sessionId: sid, helped: false, timeMs: 3000, reason: pick.reason, rng, now: new Date(2026, 9, 11, 12) });
    if (r.correct) correct++;
  }
  finishSession(s, correct, len, new Date(2026, 9, 11, 12));
  return asked;
}

const wrongOf = (q: (typeof QUESTIONS)[number]) => (q.correct + 1) % 4;

describe('dane', () => {
  it('300 pytań, wagi egzaminu = 40, każdy moduł ma pytania >= wagi', () => {
    expect(QUESTIONS.length).toBe(300);
    expect(MODULES.reduce((a, m) => a + m.weight, 0)).toBe(40);
    MODULES.forEach((m, i) => expect(QUESTIONS.filter((q) => q.mod === i).length).toBeGreaterThanOrEqual(m.weight));
  });
});

describe('pickNext', () => {
  it('w obrębie sesji pytania się nie powtarzają', () => {
    const s = fresh();
    const rng = seeded(1);
    for (let k = 0; k < 30; k++) {
      const asked = runSession(s, { kind: 'mixed' }, rng, (q) => (rng() < 0.6 ? q.correct : wrongOf(q)));
      expect(new Set(asked).size).toBe(asked.length);
    }
  });

  it('nowa sesja na świeżym stanie losuje różne pytania (nie zawsze te same)', () => {
    const a = runSession(fresh(), { kind: 'mixed' }, seeded(11), (q) => q.correct);
    const b = runSession(fresh(), { kind: 'mixed' }, seeded(22), (q) => q.correct);
    expect(a.join()).not.toBe(b.join());
  });

  it('błędna odpowiedź wraca po 9–11 pytaniach (także w następnej sesji)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = fresh();
      const rng = seeded(seed);
      const log: string[] = [];
      let target: string | null = null;
      // pierwsza odpowiedź błędna, reszta poprawna
      for (let k = 0; k < 3; k++) {
        runSession(s, { kind: 'mixed' }, rng, (q) => {
          if (target === null) {
            target = q.id;
            return wrongOf(q);
          }
          return q.correct;
        }, log);
      }
      const first = log.indexOf(target!);
      const second = log.indexOf(target!, first + 1);
      expect(first).toBe(0);
      const gap = second - first;
      expect(gap).toBeGreaterThanOrEqual(9);
      expect(gap).toBeLessThanOrEqual(11);
    }
  });

  it('kilka błędów naraz — każdy wraca, żaden nie ginie', () => {
    const s = fresh();
    const rng = seeded(5);
    const log: string[] = [];
    const wrongIds = new Set<string>();
    runSession(s, { kind: 'mixed' }, rng, (q, i) => {
      if (i < 5) {
        wrongIds.add(q.id);
        return wrongOf(q);
      }
      return q.correct;
    }, log);
    for (let k = 0; k < 3; k++) runSession(s, { kind: 'mixed' }, rng, (q) => q.correct, log);
    for (const id of wrongIds) {
      const occ = log.filter((x) => x === id).length;
      expect(occ).toBeGreaterThanOrEqual(2);
    }
    expect(s.retry.length).toBe(0);
  });

  it('pytania nie wracają zbyt często: przewaga nowych, poprawne wracają najwcześniej po 30', () => {
    for (const seed of [9, 10, 11]) {
      const s = fresh();
      const rng = seeded(seed);
      const log: string[] = [];
      for (let k = 0; k < 30; k++) runSession(s, { kind: 'mixed' }, rng, (q) => q.correct, log);
      expect(new Set(log).size).toBeGreaterThanOrEqual(240); // >= 80% pierwszych 300 to nowe pytania
      const last = new Map<string, number>();
      log.forEach((id, i) => {
        if (last.has(id)) expect(i - last.get(id)!).toBeGreaterThanOrEqual(30);
        last.set(id, i);
      });
    }
  });

  it('mały moduł (15 pytań) nie zakleszcza się przy samych błędach', () => {
    const s = fresh();
    const rng = seeded(3);
    const mod = MODULES.findIndex((m) => m.short === 'Wirtualizacja');
    for (let k = 0; k < 20; k++) {
      const asked = runSession(s, { kind: 'module', mod }, rng, (q) => wrongOf(q));
      expect(asked.length).toBe(SESSION_LEN);
      expect(new Set(asked).size).toBe(asked.length);
      for (const id of asked) expect(QUESTIONS.find((q) => q.id === id)!.mod).toBe(mod);
    }
  });

  it('w trybie mieszanym unika dwóch pytań z tego samego działu pod rząd', () => {
    const s = fresh();
    const rng = seeded(4);
    const log: string[] = [];
    for (let k = 0; k < 10; k++) runSession(s, { kind: 'mixed' }, rng, (q) => (rng() < 0.7 ? q.correct : wrongOf(q)), log);
    let same = 0;
    for (let i = 1; i < log.length; i++) {
      if (QUESTIONS.find((q) => q.id === log[i])!.mod === QUESTIONS.find((q) => q.id === log[i - 1])!.mod) same++;
    }
    expect(same / log.length).toBeLessThan(0.1); // tylko powtórki błędów mogą to złamać
  });

  it('powtórka błędów: pula = błędne i nieopanowane; mała pula skraca sesję', () => {
    const s = fresh();
    const rng = seeded(7);
    expect(poolFor(s, { kind: 'mistakes' }).length).toBe(0);
    runSession(s, { kind: 'mixed' }, rng, (q, i) => (i < 3 ? wrongOf(q) : q.correct));
    expect(poolFor(s, { kind: 'mistakes' }).length).toBe(3);
    expect(sessionLength(s, { kind: 'mistakes' })).toBe(3);
    const asked = runSession(s, { kind: 'mistakes' }, rng, (q) => q.correct);
    expect(new Set(asked).size).toBe(3);
  });

  it('symulacja 5000 odpowiedzi: zero wyjątków, wszystkie moduły odwiedzane', () => {
    const s = fresh();
    const rng = seeded(2026);
    const log: string[] = [];
    for (let k = 0; k < 500; k++) {
      const mode: LearnMode = k % 7 === 3 ? { kind: 'module', mod: k % 12 } : k % 11 === 5 && poolFor(s, { kind: 'mistakes' }).length ? { kind: 'mistakes' } : { kind: 'mixed' };
      runSession(s, mode, rng, (q) => (rng() < 0.75 ? q.correct : wrongOf(q)), log);
    }
    expect(log.length).toBeGreaterThan(4500);
    const mods = new Set(log.map((id) => QUESTIONS.find((q) => q.id === id)!.mod));
    expect(mods.size).toBe(12);
    expect(s.recent.length).toBeLessThanOrEqual(60);
    expect(JSON.stringify(s).length).toBeLessThan(200_000);
  });
});

describe('opanowanie', () => {
  const q = QUESTIONS[0];
  const ans = (s: AppState, sid: number, ok: boolean, helped = false) =>
    recordAnswer(s, q, ok ? q.correct : wrongOf(q), { sessionId: sid, helped, timeMs: 1000, reason: 'new' });

  it('2 poprawne w różnych sesjach = opanowane', () => {
    const s = fresh();
    expect(ans(s, 1, true).newlyMastered).toBe(false);
    expect(ans(s, 2, true).newlyMastered).toBe(true);
    expect(s.q[q.id].mastered).toBe(true);
  });
  it('2 poprawne w tej samej sesji nie wystarczą', () => {
    const s = fresh();
    ans(s, 1, true);
    ans(s, 1, true);
    expect(s.q[q.id].mastered).toBe(false);
  });
  it('błąd cofa opanowanie i licznik', () => {
    const s = fresh();
    ans(s, 1, true);
    ans(s, 2, true);
    ans(s, 3, false);
    expect(s.q[q.id].mastered).toBe(false);
    expect(s.q[q.id].streak).toBe(0);
    expect(s.retry.some((r) => r.id === q.id)).toBe(true);
  });
  it('poprawna odpowiedź z 50/50 nie podnosi opanowania', () => {
    const s = fresh();
    ans(s, 1, true, true);
    ans(s, 2, true, true);
    expect(s.q[q.id].mastered).toBe(false);
    expect(s.q[q.id].correct).toBe(2);
  });
});

describe('koło 50/50 w nauce', () => {
  it('odnawia się po 5 kolejnych pytaniach', () => {
    const s = fresh();
    expect(takeLifeline(s)).toBe(true);
    expect(takeLifeline(s)).toBe(false);
    const q = QUESTIONS[1];
    recordAnswer(s, q, q.correct, { sessionId: 1, helped: true, timeMs: 0, reason: 'new' });
    for (let i = 0; i < 4; i++) {
      recordAnswer(s, QUESTIONS[i + 2], 0, { sessionId: 1, helped: false, timeMs: 0, reason: 'new' });
      expect(takeLifeline(s)).toBe(false);
    }
    recordAnswer(s, QUESTIONS[10], 0, { sessionId: 1, helped: false, timeMs: 0, reason: 'new' });
    expect(takeLifeline(s)).toBe(true);
  });
});
