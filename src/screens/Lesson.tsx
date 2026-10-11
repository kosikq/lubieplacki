import { useEffect, useRef, useState } from 'preact/hooks';
import { getState, update } from '../core/store';
import {
  type LearnMode, type PickReason, finishSession, pickNext, poolFor, recordAnswer, sessionLength, startSession, takeLifeline,
} from '../core/learn';
import { fiftyFifty } from '../core/rng';
import { playCorrect, playWrong } from '../core/sound';
import type { Question } from '../data/questions';
import { LETTERS, MODULES } from '../data/modules';
import { Bar, Confirm } from '../ui/common';
import { IconClose } from '../ui/icons';
import { QuestionCard, type TileState } from '../ui/QuestionCard';
import type { Nav } from '../App';

export interface LessonSummaryData {
  mode: LearnMode;
  total: number;
  correct: number;
  xp: number;
  newlyMastered: number;
  goalReached: boolean;
  durationMs: number;
  wrongIds: string[];
}

interface Current {
  q: Question;
  reason: PickReason;
  shownAt: number;
}

export function modeTitle(mode: LearnMode) {
  if (mode.kind === 'module') return MODULES[mode.mod].short;
  if (mode.kind === 'mistakes') return 'Powtórka błędów';
  return 'Nauka';
}

export function Lesson({ mode, nav }: { mode: LearnMode; nav: Nav }) {
  // stan sesji trzymany w ref — nie zależy od re-renderów
  const sess = useRef<{
    id: number; pool: Question[]; len: number; asked: string[]; correct: number; xp: number;
    mastered: number; goal: boolean; started: number; wrong: string[];
  } | null>(null);
  if (!sess.current) {
    const s = getState();
    const pool = poolFor(s, mode);
    sess.current = {
      id: update(startSession), pool, len: sessionLength(s, mode), asked: [], correct: 0, xp: 0,
      mastered: 0, goal: false, started: Date.now(), wrong: [],
    };
  }
  const S = sess.current;

  const next = (): Current | null => {
    const p = pickNext(getState(), S.pool, S.asked, Math.random, mode.kind === 'mixed');
    if (!p) return null;
    S.asked.push(p.q.id);
    return { q: p.q, reason: p.reason, shownAt: performance.now() };
  };

  const [cur, setCur] = useState<Current | null>(() => (S.len > 0 ? next() : null));
  const [chosen, setChosen] = useState<number | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const [confirmExit, setConfirmExit] = useState(false);
  const [lifeline, setLifeline] = useState(getState().lifelineCooldown);
  const lock = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [cur]);

  if (!cur) {
    return (
      <div class="overlay">
        <div class="topbar"><button class="icon-btn" aria-label="Zamknij" onClick={() => nav.go(null)}><IconClose /></button></div>
        <div class="empty"><div class="e-ico">🎉</div><p>Brak pytań do powtórki. Wszystkie błędy zostały poprawione!</p></div>
      </div>
    );
  }

  const answered = chosen !== null;
  const isCorrect = answered && chosen === cur.q.correct;
  const index = S.asked.length; // 1-based numer bieżącego pytania

  const pick = (i: number) => {
    if (answered || lock.current || removed.includes(i)) return;
    lock.current = true;
    const helped = removed.length > 0;
    const res = update((s) =>
      recordAnswer(s, cur.q, i, { sessionId: S.id, helped, timeMs: performance.now() - cur.shownAt, reason: cur.reason }),
    );
    if (res.correct) {
      S.correct++;
      playCorrect();
    } else {
      S.wrong.push(cur.q.id);
      playWrong();
    }
    S.xp += res.xp;
    if (res.newlyMastered) S.mastered++;
    if (res.goalReached) S.goal = true;
    setLifeline(getState().lifelineCooldown);
    setChosen(i);
    lock.current = false;
  };

  const useFifty = () => {
    if (answered || removed.length) return;
    if (!update(takeLifeline)) return;
    setRemoved(fiftyFifty(cur.q.correct));
    setLifeline(getState().lifelineCooldown);
  };

  const finish = () => {
    const bonus = update((s) => finishSession(s, S.correct, S.asked.length));
    const data: LessonSummaryData = {
      mode, total: S.asked.length, correct: S.correct, xp: S.xp + bonus, newlyMastered: S.mastered,
      goalReached: S.goal, durationMs: Date.now() - S.started, wrongIds: S.wrong,
    };
    nav.go({ type: 'summary', data });
  };

  const goNext = () => {
    if (S.asked.length >= S.len) return finish();
    const n = next();
    if (!n) return finish();
    setChosen(null);
    setRemoved([]);
    setCur(n);
  };

  const states: TileState[] = cur.q.options.map((_, i) => {
    if (removed.includes(i)) return 'removed';
    if (!answered) return 'idle';
    if (i === cur.q.correct) return 'correct';
    if (i === chosen) return 'wrong';
    return 'dim';
  });

  const chip =
    cur.reason === 'retry' ? <span class="chip retry">🔁 Powtórka błędu</span>
    : cur.reason === 'new' ? <span class="chip new">Nowe</span>
    : null;

  return (
    <div class="overlay" role="dialog" aria-label={modeTitle(mode)}>
      <div class="topbar">
        <button class="icon-btn" aria-label="Zakończ sesję" onClick={() => (S.asked.length > 1 || answered ? setConfirmExit(true) : nav.go(null))}>
          <IconClose />
        </button>
        <Bar pct={(index - (answered ? 0 : 1)) / S.len} color="var(--green)" />
        <span class="tnum muted" style={{ fontSize: 15, fontWeight: 600, minWidth: 38, textAlign: 'right' }}>{index}/{S.len}</span>
      </div>
      <div class="overlay-body" ref={bodyRef}>
        <QuestionCard
          q={cur.q} states={states} onPick={pick} disabled={answered} extraChip={chip}
          animate={answered ? [cur.q.correct, isCorrect ? null : chosen] : undefined}
        />
        {!answered && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button class="pill tint" disabled={lifeline > 0 || removed.length > 0} onClick={useFifty} aria-label="Koło ratunkowe 50/50">
              🛟 50/50{lifeline > 0 ? ` · za ${lifeline}` : ''}
            </button>
          </div>
        )}
      </div>
      {answered && (
        <div class={`feedback ${isCorrect ? 'ok' : 'bad'}`} role="status" aria-live="polite">
          <div class="fb-head">
            <span>{isCorrect ? '✅' : '❌'}</span>
            <span>{isCorrect ? 'Dobrze!' : `Poprawna odpowiedź: ${LETTERS[cur.q.correct]}`}</span>
          </div>
          <div class="fb-body">
            {!isCorrect && <p style={{ fontWeight: 600, marginBottom: 6 }}>{cur.q.options[cur.q.correct]}</p>}
            <p>{cur.q.expl}</p>
            {!isCorrect && <p class="src">To pytanie wróci za ok. 10 pytań.</p>}
          </div>
          <button class={`btn ${isCorrect ? 'btn-green' : 'btn-red'}`} onClick={goNext}>
            {S.asked.length >= S.len ? 'Zakończ' : 'Dalej'}
          </button>
        </div>
      )}
      {confirmExit && (
        <Confirm
          title="Zakończyć sesję?"
          text="Udzielone odpowiedzi zostały zapisane."
          onCancel={() => setConfirmExit(false)}
          actions={[
            { label: 'Kontynuuj naukę', onClick: () => setConfirmExit(false) },
            { label: 'Zakończ', kind: 'gray', onClick: () => nav.go(null) },
          ]}
        />
      )}
    </div>
  );
}
