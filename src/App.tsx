import { useEffect, useState } from 'preact/hooks';
import { getState, onAchievements, update, useAppState } from './core/store';
import type { Achievement } from './core/achievements';
import type { LearnMode } from './core/learn';
import type { ExamRecord } from './core/state';
import { remainingMs, submitExam } from './core/exam';
import { playSuccess } from './core/sound';
import { IconChart, IconGear, IconHome, IconList, IconTrophy } from './ui/icons';
import { Home } from './screens/Home';
import { Stats } from './screens/Stats';
import { Browser } from './screens/Browser';
import { Achievements } from './screens/Achievements';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { Lesson, type LessonSummaryData } from './screens/Lesson';
import { LessonSummary } from './screens/LessonSummary';
import { ExamIntro } from './screens/ExamIntro';
import { Exam } from './screens/Exam';
import { ExamResult } from './screens/ExamResult';

export type Tab = 'home' | 'stats' | 'browse' | 'ach' | 'settings';
export type Overlay =
  | { type: 'lesson'; mode: LearnMode; key: number }
  | { type: 'summary'; data: LessonSummaryData }
  | { type: 'examIntro' }
  | { type: 'exam' }
  | { type: 'examResult'; rec: ExamRecord; fresh: boolean }
  | null;

export interface Nav {
  go: (o: Overlay) => void;
  tab: (t: Tab) => void;
}

function applyTheme(theme: 'system' | 'light' | 'dark') {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#F2F2F7');
}

export function App() {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toasts, setToasts] = useState<Achievement[]>([]);
  const [needRefresh, setNeedRefresh] = useState<null | (() => void)>(null);

  // motyw
  useEffect(() => {
    applyTheme(s.settings.theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const l = () => applyTheme(getState().settings.theme);
    mq.addEventListener?.('change', l);
    return () => mq.removeEventListener?.('change', l);
  }, [s.settings.theme]);

  // osiągnięcia -> kolejka toastów
  useEffect(
    () =>
      onAchievements((list) => {
        playSuccess();
        setToasts((t) => [...t, ...list]);
      }),
    [],
  );
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((t) => t.slice(1)), 3200);
    return () => clearTimeout(id);
  }, [toasts]);

  // egzamin, którego czas minął gdy aplikacja była zamknięta
  useEffect(() => {
    const check = () => {
      const ex = getState().activeExam;
      if (ex && remainingMs(ex) <= 0) {
        const rec = update((st) => submitExam(st, true));
        if (rec) setOverlay({ type: 'examResult', rec, fresh: true });
      }
    };
    check();
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // aktualizacje PWA (service worker)
  useEffect(() => {
    if (import.meta.env.DEV) return;
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const updateSW = registerSW({
          onNeedRefresh: () => setNeedRefresh(() => () => updateSW(true)),
        });
      })
      .catch(() => {});
  }, []);

  const nav: Nav = {
    go: setOverlay,
    tab: (t) => {
      setOverlay(null);
      setTab(t);
    },
  };

  if (!s.profile) return <Onboarding />;

  return (
    <>
      <main aria-hidden={overlay ? 'true' : undefined}>
        {needRefresh && (
          <div class="toast-wrap" style={{ top: 'auto', bottom: 'calc(var(--tabbar-h) + var(--safe-b) + 12px)' }}>
            <div class="toast">
              <span class="t-ico">✨</span>
              <div class="grow"><div class="t-t">Nowa wersja aplikacji</div></div>
              <button class="pill tint" onClick={() => needRefresh()}>Odśwież</button>
            </div>
          </div>
        )}
        {tab === 'home' && <Home nav={nav} />}
        {tab === 'stats' && <Stats nav={nav} />}
        {tab === 'browse' && <Browser />}
        {tab === 'ach' && <Achievements />}
        {tab === 'settings' && <Settings />}
        <nav class="tabbar" aria-label="Nawigacja">
          {([
            ['home', 'Start', IconHome],
            ['stats', 'Statystyki', IconChart],
            ['browse', 'Pytania', IconList],
            ['ach', 'Osiągnięcia', IconTrophy],
            ['settings', 'Ustawienia', IconGear],
          ] as const).map(([id, label, Ico]) => (
            <button class={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Ico />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </main>

      {overlay?.type === 'lesson' && <Lesson key={overlay.key} mode={overlay.mode} nav={nav} />}
      {overlay?.type === 'summary' && <LessonSummary data={overlay.data} nav={nav} />}
      {overlay?.type === 'examIntro' && <ExamIntro nav={nav} />}
      {overlay?.type === 'exam' && <Exam nav={nav} />}
      {overlay?.type === 'examResult' && <ExamResult rec={overlay.rec} fresh={overlay.fresh} nav={nav} />}

      {toasts.length > 0 && (
        <div class="toast-wrap" role="status" aria-live="polite">
          <div class="toast" key={toasts[0].id} onClick={() => setToasts((t) => t.slice(1))}>
            <span class="t-ico">{toasts[0].icon}</span>
            <div class="grow">
              <div class="t-k">Nowe osiągnięcie</div>
              <div class="t-t">{toasts[0].title}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
