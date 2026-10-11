import { useState } from 'preact/hooks';
import { useAppState } from '../core/store';
import { dayKey } from '../core/dates';
import {
  acc, avgAnswerMs, byLevel, byModule, byTopic, dailySeries, masteryPct, mostMissed, overall, predictExam, recommendations,
} from '../core/stats';
import { EXAM_PASS } from '../core/exam';
import { MODULES } from '../data/modules';
import type { Question } from '../data/questions';
import { Bar, NavRow, Ring, Segmented, Sheet, pct } from '../ui/common';
import { DailyBars, ExamLine, Heatmap } from '../ui/charts';
import { QuestionReview } from '../ui/QuestionCard';
import type { Nav } from '../App';

const TONE_ICON = { bad: '⚠️', warn: '💡', good: '💪', info: 'ℹ️' } as const;
const accColor = (a: number | null) => (a === null ? 'var(--fill2)' : a >= 0.8 ? 'var(--green)' : a >= 0.6 ? 'var(--orange)' : 'var(--red)');

export function Stats({ nav }: { nav: Nav }) {
  const s = useAppState();
  const today = dayKey();
  const [range, setRange] = useState<14 | 30>(14);
  const [modSheet, setModSheet] = useState<number | null>(null);
  const [qSheet, setQSheet] = useState<Question | null>(null);

  const all = overall(s);
  const mods = byModule(s);
  const levels = byLevel(s);
  const topics = byTopic(s).filter((t) => t.agg.attempts >= 3);
  const weakest = topics.slice().sort((a, b) => acc(a.agg)! - acc(b.agg)!).slice(0, 5);
  const strongest = topics.slice().sort((a, b) => acc(b.agg)! - acc(a.agg)!).filter((t) => !weakest.includes(t)).slice(0, 5);
  const pred = predictExam(s);
  const recs = recommendations(s);
  const series = dailySeries(s, today, range);
  const avg = avgAnswerMs(s);
  const missed = mostMissed(s);
  const rangeA = series.reduce((x, d) => x + d.a, 0);
  const rangeC = series.reduce((x, d) => x + d.c, 0);

  return (
    <div class="screen">
      <div class="wrap">
        <header class="large-title"><div class="eyebrow">Twoje postępy</div><h1>Statystyki</h1></header>

        <section class="card">
          <div class="predict">
            <Ring size={92} stroke={10} pct={pred.confident ? pred.score / 40 : 0} color={pred.score >= EXAM_PASS ? 'var(--green)' : 'var(--orange)'}>
              <div><b class="tnum">{pred.confident ? pred.score : '?'}</b><small>/40</small></div>
            </Ring>
            <div style={{ flex: 1 }}>
              <div class="muted" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Prognoza egzaminu</div>
              {pred.confident ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                    {pred.score >= EXAM_PASS + 5 ? 'Bezpiecznie powyżej progu' : pred.score >= EXAM_PASS ? 'Na granicy progu' : 'Poniżej progu'}
                  </div>
                  <p class="muted" style={{ fontSize: 14, marginTop: 2 }}>Szacowana na podstawie skuteczności w każdym dziale i jego wagi na egzaminie (próg {EXAM_PASS}).</p>
                </>
              ) : (
                <p class="muted" style={{ fontSize: 15, marginTop: 4 }}>Odpowiedz na co najmniej 30 pytań, żeby zobaczyć prognozę.</p>
              )}
            </div>
          </div>
        </section>

        <div class="stat-grid" style={{ marginTop: 12 }}>
          <div class="card"><div class="num tnum" style={{ color: accColor(acc(all)) }}>{pct(acc(all))}</div><div class="lbl">skuteczność ogólna</div></div>
          <div class="card"><div class="num tnum">{all.mastered}<span class="faint" style={{ fontSize: 17 }}>/300</span></div><div class="lbl">opanowane pytania</div></div>
          <div class="card"><div class="num tnum">{all.seen}<span class="faint" style={{ fontSize: 17 }}>/300</span></div><div class="lbl">widziane pytania</div></div>
          <div class="card"><div class="num tnum">{all.attempts}</div><div class="lbl">wszystkie odpowiedzi</div></div>
          <div class="card"><div class="num tnum">{avg ? `${(avg / 1000).toFixed(1)} s` : '—'}</div><div class="lbl">średni czas odpowiedzi</div></div>
          <div class="card"><div class="num tnum">{s.totals.bestRun}</div><div class="lbl">najdłuższa seria poprawnych</div></div>
        </div>

        <div class="section-h"><h2>Co robić dalej</h2></div>
        <div class="group">
          {recs.map((r) => (
            <div class={`row rec ${r.tone}`}>
              <span class="dot">{TONE_ICON[r.tone]}</span>
              <div class="grow"><b>{r.title}</b><p>{r.text}</p></div>
            </div>
          ))}
        </div>

        <div class="section-h"><h2>Aktywność</h2><span class="aside tnum">{rangeA ? `${pct(rangeC / rangeA)} · ${rangeA} odp.` : ''}</span></div>
        <div class="card">
          <Segmented label="Zakres" value={range} onChange={setRange} options={[{ value: 14, label: '14 dni' }, { value: 30, label: '30 dni' }]} />
          <div style={{ marginTop: 14 }}><DailyBars data={series} /></div>
          <div class="legend"><span><i style={{ background: 'var(--green)' }} />poprawne</span><span><i style={{ background: 'var(--red)', opacity: 0.35 }} />błędne</span></div>
        </div>
        <div class="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <b style={{ fontSize: 15 }}>Kalendarz nauki</b>
            <span class="muted" style={{ fontSize: 13 }}>🔥 rekord: {s.streak.best} dni</span>
          </div>
          <Heatmap days={s.days} today={today} goal={s.profile!.goal} />
          <div class="legend"><span><i style={{ background: 'var(--fill)' }} />brak</span><span><i style={{ background: 'rgba(52,199,89,.65)' }} />część celu</span><span><i style={{ background: 'var(--green)' }} />cel osiągnięty</span></div>
        </div>

        <div class="section-h"><h2>Działy</h2><span class="aside">opanowanie · skuteczność</span></div>
        <div class="group">
          {MODULES.map((m, i) => {
            const a = mods[i];
            return (
              <button class="row with-icon" onClick={() => setModSheet(i)}>
                <span class="icon-tile" style={{ background: m.color }}>{m.icon}</span>
                <div class="grow">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{m.short}</span>
                    <span class="tnum" style={{ fontSize: 14, fontWeight: 600, color: accColor(acc(a)) }}>{pct(acc(a))}</span>
                  </div>
                  <div style={{ marginTop: 6 }}><Bar pct={masteryPct(a)} color="var(--green)" thin /></div>
                  <div class="sub tnum">{a.mastered}/{a.total} opanowane · {a.seen} widziane · {a.attempts} odp.</div>
                </div>
              </button>
            );
          })}
        </div>

        <div class="section-h"><h2>Poziom trudności</h2></div>
        <div class="group">
          {levels.map((l) => (
            <NavRow title={l.name} sub={`${l.agg.attempts} odp. · ${l.agg.mastered}/${l.agg.total} opanowane`} value={<span style={{ color: accColor(acc(l.agg)), fontWeight: 600 }}>{pct(acc(l.agg))}</span>} />
          ))}
        </div>

        {topics.length >= 3 && (
          <>
            <div class="section-h"><h2>Najsłabsze tematy</h2></div>
            <div class="group">
              {weakest.map((t) => (
                <NavRow icon={MODULES[t.mod].icon} color={MODULES[t.mod].color} title={t.name} sub={`${MODULES[t.mod].short} · ${t.agg.attempts} odp.`} value={<span style={{ color: accColor(acc(t.agg)), fontWeight: 600 }}>{pct(acc(t.agg))}</span>} />
              ))}
            </div>
            {strongest.length > 0 && (
              <>
                <div class="section-h"><h2>Najmocniejsze tematy</h2></div>
                <div class="group">
                  {strongest.map((t) => (
                    <NavRow icon={MODULES[t.mod].icon} color={MODULES[t.mod].color} title={t.name} sub={`${MODULES[t.mod].short} · ${t.agg.attempts} odp.`} value={<span style={{ color: accColor(acc(t.agg)), fontWeight: 600 }}>{pct(acc(t.agg))}</span>} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div class="section-h"><h2>Egzaminy próbne</h2><span class="aside">{s.exams.length ? `${s.exams.filter((e) => e.score >= EXAM_PASS).length}/${s.exams.length} zdanych` : ''}</span></div>
        <div class="card">
          {s.exams.length ? (
            <>
              <ExamLine scores={s.exams.slice(-15).map((e) => e.score)} pass={EXAM_PASS} />
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, textAlign: 'center' }}>
                <div><b class="tnum">{Math.max(...s.exams.map((e) => e.score))}</b><div class="muted" style={{ fontSize: 12 }}>najlepszy</div></div>
                <div><b class="tnum">{(s.exams.reduce((a, e) => a + e.score, 0) / s.exams.length).toFixed(1)}</b><div class="muted" style={{ fontSize: 12 }}>średnia</div></div>
                <div><b class="tnum">{s.exams[s.exams.length - 1].score}</b><div class="muted" style={{ fontSize: 12 }}>ostatni</div></div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p class="muted" style={{ fontSize: 15, marginBottom: 12 }}>Nie masz jeszcze żadnego podejścia.</p>
              <button class="btn btn-tinted" onClick={() => nav.go({ type: 'examIntro' })}>Zrób egzamin próbny</button>
            </div>
          )}
        </div>

        {missed.length > 0 && (
          <>
            <div class="section-h"><h2>Najczęściej mylone</h2></div>
            <div class="group">
              {missed.map((m) => (
                <button class="row q-row" onClick={() => setQSheet(m.q)}>
                  <span class={`status-dot ${m.mastered ? 'mastered' : 'weak'}`} />
                  <div class="grow">
                    <div class="q-t">{m.q.text}</div>
                    <div class="sub">✗ {m.wrong} · ✓ {m.correct} · {MODULES[m.q.mod].short}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {modSheet !== null && (
        <Sheet title={MODULES[modSheet].short} onClose={() => setModSheet(null)}>
          <ModuleDetail mod={modSheet} />
          <button class="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { const mod = modSheet; setModSheet(null); nav.go({ type: 'lesson', mode: { kind: 'module', mod }, key: Date.now() }); }}>
            Ucz się tego działu
          </button>
        </Sheet>
      )}
      {qSheet && (
        <Sheet title={qSheet.id} onClose={() => setQSheet(null)}>
          <QuestionReview q={qSheet} />
        </Sheet>
      )}
    </div>
  );
}

function ModuleDetail({ mod }: { mod: number }) {
  const s = useAppState();
  const a = byModule(s)[mod];
  const topics = byTopic(s).filter((t) => t.mod === mod);
  return (
    <>
      <div class="stat-grid">
        <div class="card"><div class="num tnum">{pct(masteryPct(a))}</div><div class="lbl">opanowane ({a.mastered}/{a.total})</div></div>
        <div class="card"><div class="num tnum" style={{ color: accColor(acc(a)) }}>{pct(acc(a))}</div><div class="lbl">skuteczność ({a.attempts} odp.)</div></div>
      </div>
      <p class="footnote" style={{ margin: '10px 4px' }}>Na egzaminie: {MODULES[mod].weight} z 40 pytań.</p>
      {topics.length > 1 && (
        <div class="group">
          {topics.map((t) => (
            <div class="row">
              <div class="grow">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15 }}>{t.name}</span>
                  <span class="tnum" style={{ fontSize: 14, fontWeight: 600, color: accColor(acc(t.agg)) }}>{pct(acc(t.agg))}</span>
                </div>
                <div style={{ marginTop: 5 }}><Bar pct={masteryPct(t.agg)} color="var(--green)" thin /></div>
                <div class="sub tnum">{t.agg.mastered}/{t.agg.total} opanowane · {t.agg.attempts} odp.</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
