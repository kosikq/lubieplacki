import { useEffect, useRef, useState } from 'preact/hooks';
import { update, useAppState } from '../core/store';
import { examLifeline, remainingMs, submitExam } from '../core/exam';
import { BY_ID } from '../data/questions';
import { Confirm, Sheet, fmtDuration } from '../ui/common';
import { IconClose, IconFlag, IconGrid, IconLeft, IconRight } from '../ui/icons';
import { QuestionCard, type TileState } from '../ui/QuestionCard';
import type { Nav } from '../App';

export function Exam({ nav }: { nav: Nav }) {
  const s = useAppState();
  const ex = s.activeExam;
  const [now, setNow] = useState(Date.now());
  const [grid, setGrid] = useState(false);
  const [confirm, setConfirm] = useState<null | 'submit' | 'exit'>(null);
  const done = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const finish = (timedOut: boolean) => {
    if (done.current) return;
    done.current = true;
    const rec = update((st) => submitExam(st, timedOut));
    if (rec) nav.go({ type: 'examResult', rec, fresh: true });
  };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const left = ex ? remainingMs(ex, now) : 0;
  useEffect(() => {
    if (ex && left <= 0) finish(true);
  }, [left <= 0]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [ex?.current]);

  if (!ex) return null;

  const i = ex.current;
  const q = BY_ID.get(ex.ids[i])!;
  const answeredCount = ex.answers.filter((a) => a !== null).length;
  const flaggedCount = ex.flags.filter(Boolean).length;

  const go = (idx: number) => update((st) => { if (st.activeExam) st.activeExam.current = Math.max(0, Math.min(st.activeExam.ids.length - 1, idx)); });
  const pick = (opt: number) =>
    update((st) => {
      const e = st.activeExam;
      if (!e || remainingMs(e) <= 0) return;
      e.answers[e.current] = e.answers[e.current] === opt ? null : opt;
    });
  const flag = () => update((st) => { const e = st.activeExam; if (e) e.flags[e.current] = !e.flags[e.current]; });
  const fifty = () => update((st) => { const e = st.activeExam; if (e) examLifeline(e, e.current); });

  const states: TileState[] = q.options.map((_, k) =>
    ex.removed[i].includes(k) ? 'removed' : ex.answers[i] === k ? 'selected' : 'idle',
  );
  const low = left < 5 * 60_000;
  const last = i === ex.ids.length - 1;

  return (
    <div class="overlay" role="dialog" aria-label="Egzamin">
      <div class="topbar">
        <button class="icon-btn" aria-label="Wyjdź z egzaminu" onClick={() => setConfirm('exit')}><IconClose /></button>
        <span class={`pill timer${low ? ' low' : ''}`} role="timer" aria-label="Pozostały czas">⏱ {fmtDuration(left)}</span>
        <span style={{ flex: 1 }} />
        <button class="pill" onClick={() => setGrid(true)} aria-label="Lista pytań">
          <IconGrid size={16} /> <span class="tnum">{i + 1}/{ex.ids.length}</span>
        </button>
      </div>
      <div class="overlay-body" ref={bodyRef}>
        <QuestionCard
          q={q} states={states} onPick={pick}
          extraChip={ex.flags[i] ? <span class="chip retry">🚩 Oznaczone</span> : null}
        />
        <p class="footnote" style={{ textAlign: 'center', marginTop: 14 }}>
          Odpowiedziano {answeredCount}/{ex.ids.length}{flaggedCount ? ` · oznaczone ${flaggedCount}` : ''}
        </p>
      </div>
      <div class="overlay-foot">
        <div class="exam-foot">
          <button class="btn btn-gray sq" aria-label="Poprzednie pytanie" disabled={i === 0} onClick={() => go(i - 1)}><IconLeft /></button>
          <button class={`btn sq ${ex.flags[i] ? 'btn-tinted' : 'btn-gray'}`} style={ex.flags[i] ? { color: 'var(--orange)', background: 'var(--orange-soft)' } : undefined} aria-label="Oznacz pytanie" aria-pressed={ex.flags[i]} onClick={flag}>
            <IconFlag />
          </button>
          <button class="btn btn-gray" style={{ flex: 1, fontSize: 15 }} disabled={ex.lifelines <= 0 || ex.removed[i].length > 0} onClick={fifty} aria-label="Koło ratunkowe 50/50">
            🛟 50/50 · {ex.lifelines}
          </button>
          {last ? (
            <button class="btn btn-primary" style={{ flex: 1.2 }} onClick={() => setConfirm('submit')}>Oddaj</button>
          ) : (
            <button class="btn btn-primary sq" aria-label="Następne pytanie" onClick={() => go(i + 1)}><IconRight /></button>
          )}
        </div>
      </div>

      {grid && (
        <Sheet title="Pytania" onClose={() => setGrid(false)}>
          <div class="exam-grid">
            {ex.ids.map((_, k) => (
              <button
                class={`${ex.answers[k] !== null ? 'answered' : ''}${ex.flags[k] ? ' flag' : ''}${k === i ? ' current' : ''}`}
                aria-label={`Pytanie ${k + 1}${ex.answers[k] !== null ? ', odpowiedziane' : ''}${ex.flags[k] ? ', oznaczone' : ''}`}
                onClick={() => {
                  go(k);
                  setGrid(false);
                }}
              >
                {k + 1}
              </button>
            ))}
          </div>
          <div class="legend" style={{ marginTop: 14 }}>
            <span><i style={{ background: 'var(--tint)' }} />odpowiedziane</span>
            <span><i style={{ background: 'var(--orange)', borderRadius: '50%' }} />oznaczone</span>
          </div>
          <button class="btn btn-primary" style={{ marginTop: 18 }} onClick={() => { setGrid(false); setConfirm('submit'); }}>Oddaj egzamin</button>
        </Sheet>
      )}

      {confirm === 'submit' && (
        <Confirm
          title="Oddać egzamin?"
          text={`Odpowiedziano ${answeredCount}/${ex.ids.length}.${ex.ids.length - answeredCount ? ` Pytania bez odpowiedzi liczą się jako błędne.` : ''}${flaggedCount ? ` Masz ${flaggedCount} oznaczonych pytań.` : ''}`}
          onCancel={() => setConfirm(null)}
          actions={[{ label: 'Oddaj i sprawdź wynik', onClick: () => finish(false) }]}
        />
      )}
      {confirm === 'exit' && (
        <Confirm
          title="Wyjść z egzaminu?"
          text="Możesz wrócić później, ale czas nadal płynie."
          onCancel={() => setConfirm(null)}
          actions={[
            { label: 'Wróć później', kind: 'gray', onClick: () => nav.go(null) },
            {
              label: 'Porzuć egzamin', kind: 'danger',
              onClick: () => {
                done.current = true;
                update((st) => { st.activeExam = null; });
                nav.go(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
