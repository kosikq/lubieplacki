import { useState } from 'preact/hooks';
import { update, useAppState } from '../core/store';
import { dayKey } from '../core/dates';
import { displayStreak } from '../core/streak';
import { levelInfo } from '../core/xp';
import { byModule, focusAreas, masteryPct, overall, acc } from '../core/stats';
import { poolFor, type LearnMode } from '../core/learn';
import { remainingMs } from '../core/exam';
import { MODULES } from '../data/modules';
import { Bar, NavRow, Ring, Sheet, fmtDuration, pct, plural } from '../ui/common';
import { IconShare } from '../ui/icons';
import type { Nav } from '../App';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Dobranoc';
  if (h < 12) return 'Dzień dobry';
  if (h < 18) return 'Cześć';
  return 'Dobry wieczór';
}

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

let lessonKey = 0;

export function Home({ nav }: { nav: Nav }) {
  const s = useAppState();
  const [pickModule, setPickModule] = useState(false);
  const today = dayKey();
  const goal = s.profile!.goal;
  const done = s.days[today]?.a ?? 0;
  const streak = displayStreak(s, today);
  const lvl = levelInfo(s.xp);
  const all = overall(s);
  const mods = byModule(s);
  const focus = focusAreas(s);
  const mistakes = poolFor(s, { kind: 'mistakes' }).length;
  const ex = s.activeExam;

  const start = (mode: LearnMode) => nav.go({ type: 'lesson', mode, key: ++lessonKey });

  const showInstall = isIOS() && !isStandalone() && !s.settings.installHintDismissed;

  return (
    <div class="screen">
      <div class="wrap">
        <header class="large-title">
          <div class="eyebrow">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{greeting()}, {s.profile!.name}</h1>
        </header>

        {showInstall && (
          <div class="card install-card">
            <span class="icon-tile lg" style={{ background: 'var(--tint)' }}><IconShare size={22} /></span>
            <div class="grow" style={{ flex: 1 }}>
              <b>Zainstaluj aplikację</b>
              <p>W Safari stuknij <b>Udostępnij</b>, a potem <b>„Do ekranu początkowego”</b>. Aplikacja będzie działać offline, a Twój postęp będzie bezpieczny.</p>
            </div>
            <button class="icon-btn" aria-label="Ukryj" onClick={() => update((st) => { st.settings.installHintDismissed = true; })}>✕</button>
          </div>
        )}

        {ex && remainingMs(ex) > 0 && (
          <button class="banner" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav.go({ type: 'exam' })}>
            <span>📝</span>
            <span class="grow">Egzamin w toku · zostało {fmtDuration(remainingMs(ex))}</span>
            <span>Wróć ›</span>
          </button>
        )}

        <section class="card">
          <div class="hero">
            <Ring size={104} stroke={11} pct={done / goal} color={done >= goal ? 'var(--green)' : 'var(--tint)'}>
              <div>
                <b class="tnum">{Math.min(done, 999)}<span style={{ fontSize: 14, color: 'var(--label2)' }}>/{goal}</span></b>
                <small>{done >= goal ? 'cel ✓' : 'dziś'}</small>
              </div>
            </Ring>
            <div class="stats-col">
              <div class="kv">
                <span class="k-ico">🔥</span>
                <div>
                  <b class="tnum" style={{ color: streak.days ? 'var(--orange)' : undefined }}>{streak.days} {plural(streak.days, 'dzień', 'dni', 'dni')}</b>
                  <span>{streak.doneToday ? 'Streak przedłużony dziś' : streak.atRisk ? 'Zrób cel, by nie stracić streaka' : 'Osiągnij cel, by zacząć streak'}</span>
                </div>
              </div>
              <div class="kv">
                <span class="k-ico">⭐</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b class="tnum">Poziom {lvl.level}</b>
                  <span>{lvl.rank} · {lvl.into}/{lvl.need} XP</span>
                  <div style={{ marginTop: 5 }}><Bar pct={lvl.pct} color="var(--yellow)" thin /></div>
                </div>
              </div>
            </div>
          </div>
          {s.streak.freezes > 0 && (
            <p class="muted" style={{ fontSize: 13, marginTop: 10 }}>🧊 Zamrożenia streaka: {s.streak.freezes}</p>
          )}
          <button class="btn btn-primary cta" onClick={() => start({ kind: 'mixed' })}>Ucz się · 10 pytań</button>
        </section>

        <div class="tiles">
          <button class="tile" onClick={() => mistakes && start({ kind: 'mistakes' })} disabled={!mistakes} style={{ opacity: mistakes ? 1 : 0.55 }}>
            <span class="icon-tile" style={{ background: 'var(--red)' }}>🔁</span>
            <span class="t-title">Powtórka błędów</span>
            <span class="t-sub">{mistakes ? `${mistakes} do poprawy` : 'Brak błędów 🎉'}</span>
          </button>
          <button class="tile" onClick={() => setPickModule(true)}>
            <span class="icon-tile" style={{ background: 'var(--indigo)' }}>📂</span>
            <span class="t-title">Wybierz dział</span>
            <span class="t-sub">12 działów</span>
          </button>
          <button class="tile" onClick={() => nav.go(ex ? { type: 'exam' } : { type: 'examIntro' })}>
            <span class="icon-tile" style={{ background: 'var(--orange)' }}>📝</span>
            <span class="t-title">Egzamin próbny</span>
            <span class="t-sub">{s.exams.length ? `Najlepszy: ${Math.max(...s.exams.map((e) => e.score))}/40` : '40 pytań · 40 min'}</span>
          </button>
        </div>

        <div class="section-h">
          <h2>Opanowanie</h2>
          <span class="aside tnum">{all.mastered}/{all.total} · {pct(masteryPct(all))}</span>
        </div>
        <div class="card" style={{ paddingBottom: 14 }}>
          <Bar pct={masteryPct(all)} color="var(--green)" />
          <div class="legend">
            <span><i style={{ background: 'var(--green)' }} />opanowane {all.mastered}</span>
            <span><i style={{ background: 'var(--fill2)' }} />widziane {all.seen}</span>
            <span>nowe {all.total - all.seen}</span>
          </div>
        </div>

        {focus.length > 0 && all.attempts > 0 && (
          <>
            <div class="section-h"><h2>Skup się na</h2></div>
            <div class="group">
              {focus.map((f) => (
                <NavRow
                  icon={MODULES[f.mod].icon} color={MODULES[f.mod].color} title={MODULES[f.mod].short}
                  sub={`${pct(acc(f.agg))} trafień · ${f.agg.mastered}/${f.agg.total} opanowane · ${MODULES[f.mod].weight} pyt. na egzaminie`}
                  onClick={() => start({ kind: 'module', mod: f.mod })}
                />
              ))}
            </div>
          </>
        )}

        <div class="section-h"><h2>Działy</h2></div>
        <div class="group">
          {MODULES.map((m, i) => (
            <button class="row with-icon mod-row" onClick={() => start({ kind: 'module', mod: i })}>
              <span class="icon-tile" style={{ background: m.color }}>{m.icon}</span>
              <div class="grow">
                <div class="title" style={{ fontSize: 16 }}>{m.short}</div>
                <Bar pct={masteryPct(mods[i])} color="var(--green)" thin />
              </div>
              <span class="pct tnum">{pct(masteryPct(mods[i]))}</span>
            </button>
          ))}
        </div>
        <p class="footnote">Pytanie jest opanowane po 2 poprawnych odpowiedziach z rzędu w różnych sesjach (bez koła 50/50).</p>
      </div>

      {pickModule && (
        <Sheet title="Wybierz dział" onClose={() => setPickModule(false)}>
          <div class="group">
            {MODULES.map((m, i) => (
              <NavRow
                icon={m.icon} color={m.color} title={m.title}
                sub={`${mods[i].mastered}/${mods[i].total} opanowane · ${pct(acc(mods[i]))} trafień`}
                onClick={() => {
                  setPickModule(false);
                  start({ kind: 'module', mod: i });
                }}
              />
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
