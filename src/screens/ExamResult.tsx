import { useEffect, useState } from 'preact/hooks';
import { EXAM_PASS, perModuleScore } from '../core/exam';
import type { ExamRecord } from '../core/state';
import { playSuccess } from '../core/sound';
import { BY_ID } from '../data/questions';
import { LETTERS, MODULES } from '../data/modules';
import { Bar, Ring, Segmented, Sheet, fmtDate, fmtDuration } from '../ui/common';
import { IconClose } from '../ui/icons';
import { QuestionReview } from '../ui/QuestionCard';
import type { Nav } from '../App';

export function ExamResult({ rec, fresh, nav }: { rec: ExamRecord; fresh: boolean; nav: Nav }) {
  const pass = rec.score >= EXAM_PASS;
  const [filter, setFilter] = useState<'wrong' | 'all'>('wrong');
  const [open, setOpen] = useState<number | null>(null);
  const mods = perModuleScore(rec).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const answered = rec.answers.filter((a) => a !== null).length;

  useEffect(() => {
    if (fresh && pass) playSuccess();
  }, []);

  const items = rec.ids
    .map((id, i) => ({ q: BY_ID.get(id), i, a: rec.answers[i] }))
    .filter((x) => x.q && (filter === 'all' || x.a !== x.q.correct));

  return (
    <div class="overlay" role="dialog" aria-label="Wynik egzaminu">
      <div class="topbar">
        <button class="icon-btn" aria-label="Zamknij" onClick={() => nav.go(null)}><IconClose /></button>
        <span class="muted" style={{ fontSize: 15 }}>{fmtDate(rec.at)}</span>
      </div>
      <div class="overlay-body">
        <div class="wrap">
          <div class="result-hero">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Ring size={170} stroke={14} pct={rec.score / rec.total} color={pass ? 'var(--green)' : 'var(--red)'}>
                <div>
                  <div class="score tnum">{rec.score}</div>
                  <small class="tnum">z {rec.total} · próg {EXAM_PASS}</small>
                </div>
              </Ring>
            </div>
            <span class={`pill verdict ${pass ? 'green' : 'red'}`} style={{ fontSize: 17, height: 36, padding: '0 16px' }}>
              {pass ? '✅ Zaliczony' : '❌ Niezaliczony'}
            </span>
            <p class="muted" style={{ fontSize: 15, marginTop: 10 }}>
              {pass ? `Masz ${rec.score - EXAM_PASS} pkt zapasu nad progiem.` : `Zabrakło ${EXAM_PASS - rec.score} pkt do progu.`}
            </p>
          </div>

          <div class="stat-grid" style={{ marginTop: 16 }}>
            <div class="card"><div class="num tnum">{fmtDuration(rec.durationMs)}</div><div class="lbl">{rec.timedOut ? 'koniec czasu' : 'czas'}</div></div>
            <div class="card"><div class="num tnum">{answered}/{rec.total}</div><div class="lbl">odpowiedziano</div></div>
            <div class="card"><div class="num tnum">{Math.round((rec.score / rec.total) * 100)}%</div><div class="lbl">skuteczność</div></div>
            <div class="card"><div class="num tnum">{rec.lifelinesUsed}/3</div><div class="lbl">użyte 50/50</div></div>
          </div>

          <div class="section-h"><h2>Wynik w działach</h2></div>
          <div class="group">
            {mods.map((m) => (
              <div class="row with-icon">
                <span class="icon-tile" style={{ background: MODULES[m.mod].color }}>{MODULES[m.mod].icon}</span>
                <div class="grow">
                  <div class="title" style={{ fontSize: 15 }}>{MODULES[m.mod].short}</div>
                  <Bar pct={m.correct / m.total} thin color={m.correct / m.total >= 0.625 ? 'var(--green)' : 'var(--red)'} />
                </div>
                <span class="value tnum" style={{ fontWeight: 600 }}>{m.correct}/{m.total}</span>
              </div>
            ))}
          </div>

          <div class="section-h"><h2>Przegląd</h2></div>
          <Segmented
            label="Filtr pytań" value={filter} onChange={setFilter}
            options={[{ value: 'wrong', label: `Błędne (${rec.total - rec.score})` }, { value: 'all', label: `Wszystkie (${rec.total})` }]}
          />
          <div class="group" style={{ marginTop: 10 }}>
            {items.length === 0 && <div class="empty"><div class="e-ico">🏆</div>Bez błędów!</div>}
            {items.map(({ q, i, a }) => {
              const ok = a === q!.correct;
              return (
                <button class="row q-row" onClick={() => setOpen(i)}>
                  <span class="tnum" style={{ fontWeight: 700, width: 26, color: ok ? 'var(--green)' : 'var(--red)' }}>{i + 1}</span>
                  <div class="grow">
                    <div class="q-t">{q!.text}</div>
                    <div class="sub">
                      {a === null ? 'Brak odpowiedzi' : ok ? `✓ ${LETTERS[a]}` : `Twoja: ${LETTERS[a]} · poprawna: ${LETTERS[q!.correct]}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div class="overlay-foot">
        <div class="wrap btn-row">
          <button class="btn btn-gray" onClick={() => nav.go(null)}>Zamknij</button>
          <button class="btn btn-primary" onClick={() => nav.go({ type: 'examIntro' })}>Nowy egzamin</button>
        </div>
      </div>
      {open !== null && (
        <Sheet title={`Pytanie ${open + 1}`} onClose={() => setOpen(null)}>
          <QuestionReview q={BY_ID.get(rec.ids[open])!} chosen={rec.answers[open]} />
        </Sheet>
      )}
    </div>
  );
}
