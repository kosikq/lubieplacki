import { useEffect } from 'preact/hooks';
import { useAppState } from '../core/store';
import { dayKey } from '../core/dates';
import { displayStreak } from '../core/streak';
import { levelInfo } from '../core/xp';
import { playSuccess } from '../core/sound';
import { BY_ID } from '../data/questions';
import { Bar, NavRow, Ring, fmtDuration, plural } from '../ui/common';
import { modeTitle, type LessonSummaryData } from './Lesson';
import type { Nav } from '../App';

let key = 1000;

export function LessonSummary({ data, nav }: { data: LessonSummaryData; nav: Nav }) {
  const s = useAppState();
  const today = dayKey();
  const ratio = data.total ? data.correct / data.total : 0;
  const streak = displayStreak(s, today);
  const lvl = levelInfo(s.xp);
  const goal = s.profile!.goal;
  const done = s.days[today]?.a ?? 0;

  useEffect(() => {
    if (data.goalReached || ratio === 1) playSuccess();
  }, []);

  const headline =
    ratio === 1 ? 'Bezbłędnie! 🏆' : ratio >= 0.8 ? 'Świetna robota!' : ratio >= 0.5 ? 'Dobra sesja' : 'Każdy błąd to lekcja';

  return (
    <div class="overlay" role="dialog" aria-label="Podsumowanie sesji">
      <div class="overlay-body" style={{ paddingTop: 'calc(var(--safe-t) + 24px)' }}>
        <div class="wrap">
          <div style={{ textAlign: 'center' }}>
            <p class="muted" style={{ fontSize: 15, fontWeight: 600 }}>{modeTitle(data.mode)} · ukończono</p>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: '4px 0 18px', letterSpacing: '-0.02em' }}>{headline}</h1>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Ring size={150} stroke={14} pct={ratio} color={ratio >= 0.6 ? 'var(--green)' : ratio >= 0.4 ? 'var(--orange)' : 'var(--red)'}>
                <div>
                  <b class="tnum" style={{ fontSize: 40 }}>{data.correct}/{data.total}</b>
                  <small>poprawnych</small>
                </div>
              </Ring>
            </div>
          </div>

          <div class="stat-grid" style={{ marginTop: 22 }}>
            <div class="card"><div class="num tnum" style={{ color: 'var(--yellow)' }}>+{data.xp}</div><div class="lbl">XP · poziom {lvl.level}</div></div>
            <div class="card"><div class="num tnum">{fmtDuration(data.durationMs)}</div><div class="lbl">czas sesji</div></div>
            <div class="card"><div class="num tnum" style={{ color: 'var(--green)' }}>{data.newlyMastered}</div><div class="lbl">{plural(data.newlyMastered, 'nowe opanowane', 'nowe opanowane', 'nowych opanowanych')}</div></div>
            <div class="card"><div class="num tnum" style={{ color: streak.days ? 'var(--orange)' : undefined }}>🔥 {streak.days}</div><div class="lbl">streak ({plural(streak.days, 'dzień', 'dni', 'dni')})</div></div>
          </div>

          <div class="card" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 15 }}>
              <b>Cel dzienny</b>
              <span class="tnum muted">{Math.min(done, goal)}/{goal}</span>
            </div>
            <Bar pct={done / goal} color={done >= goal ? 'var(--green)' : 'var(--tint)'} />
            <p class="muted" style={{ fontSize: 14, marginTop: 8 }}>
              {data.goalReached ? `🎉 Cel osiągnięty — streak: ${streak.days} ${plural(streak.days, 'dzień', 'dni', 'dni')}!`
                : done >= goal ? 'Cel na dziś już zaliczony.'
                : `Jeszcze ${goal - done} ${plural(goal - done, 'pytanie', 'pytania', 'pytań')} do celu.`}
            </p>
          </div>

          {data.wrongIds.length > 0 && (
            <>
              <div class="section-h"><h2>Do powtórki</h2><span class="aside">wrócą za ok. 10 pytań</span></div>
              <div class="group">
                {data.wrongIds.map((id) => {
                  const q = BY_ID.get(id)!;
                  return <NavRow title={<span style={{ fontSize: 15 }}>{q.text}</span>} sub={`Poprawna: ${q.options[q.correct]}`} />;
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div class="overlay-foot">
        <div class="wrap" style={{ display: 'grid', gap: 10 }}>
          <button class="btn btn-primary" onClick={() => nav.go({ type: 'lesson', mode: data.mode, key: ++key })}>Kolejna sesja</button>
          <button class="btn btn-gray" onClick={() => nav.go(null)}>Wróć do startu</button>
        </div>
      </div>
    </div>
  );
}
