import { useMemo, useState } from 'preact/hooks';
import { useAppState } from '../core/store';
import type { AppState } from '../core/state';
import { QUESTIONS, type Question } from '../data/questions';
import { MODULES } from '../data/modules';
import { Segmented, Sheet } from '../ui/common';
import { IconSearch } from '../ui/icons';
import { QuestionReview } from '../ui/QuestionCard';

type Status = 'all' | 'new' | 'weak' | 'mastered';

/** Normalizacja do wyszukiwania: małe litery, bez polskich znaków. */
export function norm(t: string): string {
  return t.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
const INDEX = QUESTIONS.map((q) => norm(`${q.id} ${q.text} ${q.options.join(' ')} ${q.topic ?? ''}`));

function statusOf(s: AppState, id: string): Exclude<Status, 'all'> | 'seen' {
  const st = s.q[id];
  if (!st || st.seen === 0) return 'new';
  if (st.mastered) return 'mastered';
  if (st.wrong > 0) return 'weak';
  return 'seen';
}

export function Browser() {
  const s = useAppState();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [mod, setMod] = useState<number | null>(null);
  const [open, setOpen] = useState<Question | null>(null);

  const list = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return QUESTIONS.filter((q, i) => {
      if (mod !== null && q.mod !== mod) return false;
      if (status !== 'all') {
        const st = statusOf(s, q.id);
        if (status === 'weak' ? st !== 'weak' : status === 'new' ? st !== 'new' : st !== 'mastered') return false;
      }
      return terms.every((t) => INDEX[i].includes(t));
    });
  }, [query, status, mod, s.q, s.n]);

  const st = open ? s.q[open.id] : undefined;

  return (
    <div class="screen">
      <div class="wrap">
        <header class="large-title"><div class="eyebrow">Baza 300 pytań</div><h1>Pytania</h1></header>
        <label class="search">
          <IconSearch />
          <input type="search" placeholder="Szukaj w pytaniach i odpowiedziach" value={query} enterKeyHint="search"
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)} aria-label="Szukaj" />
          {query && <button aria-label="Wyczyść" onClick={() => setQuery('')} style={{ color: 'var(--label2)' }}>✕</button>}
        </label>
        <div style={{ marginTop: 10 }}>
          <Segmented label="Status" value={status} onChange={setStatus}
            options={[{ value: 'all', label: 'Wszystkie' }, { value: 'new', label: 'Nowe' }, { value: 'weak', label: 'Do poprawy' }, { value: 'mastered', label: 'Opanowane' }]} />
        </div>
        <div class="chips-scroll">
          <button class={`pill${mod === null ? ' tint' : ''}`} onClick={() => setMod(null)}>Wszystkie działy</button>
          {MODULES.map((m, i) => (
            <button class={`pill${mod === i ? ' tint' : ''}`} onClick={() => setMod(mod === i ? null : i)}>{m.icon} {m.short}</button>
          ))}
        </div>
        <p class="footnote" style={{ margin: '12px 4px 8px' }}>{list.length} {list.length === 1 ? 'pytanie' : 'pytań'}</p>
        {list.length === 0 ? (
          <div class="empty"><div class="e-ico">🔍</div>Brak pytań dla wybranych filtrów.</div>
        ) : (
          <div class="group">
            {list.map((q) => {
              const stt = statusOf(s, q.id);
              return (
                <button class="row q-row" onClick={() => setOpen(q)}>
                  <span class={`status-dot ${stt}`} aria-label={stt} />
                  <div class="grow">
                    <div class="q-id">{q.id} · {MODULES[q.mod].short}</div>
                    <div class="q-t">{q.text}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div class="legend" style={{ margin: '10px 4px' }}>
          <span><i style={{ background: 'var(--green)', borderRadius: '50%' }} />opanowane</span>
          <span><i style={{ background: 'var(--red)', borderRadius: '50%' }} />do poprawy</span>
          <span><i style={{ background: 'var(--orange)', borderRadius: '50%' }} />widziane</span>
          <span><i style={{ background: 'var(--fill2)', borderRadius: '50%' }} />nowe</span>
        </div>
      </div>
      {open && (
        <Sheet title={open.id} onClose={() => setOpen(null)}>
          <QuestionReview q={open} />
          <div class="card" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div><b class="tnum">{st?.seen ?? 0}</b><div class="muted" style={{ fontSize: 12 }}>razy</div></div>
            <div><b class="tnum" style={{ color: 'var(--green)' }}>{st?.correct ?? 0}</b><div class="muted" style={{ fontSize: 12 }}>dobrze</div></div>
            <div><b class="tnum" style={{ color: 'var(--red)' }}>{st?.wrong ?? 0}</b><div class="muted" style={{ fontSize: 12 }}>źle</div></div>
            <div><b>{st?.mastered ? '✅' : '—'}</b><div class="muted" style={{ fontSize: 12 }}>opanowane</div></div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
