import { update, useAppState } from '../core/store';
import { EXAM_LIFELINES, EXAM_PASS, EXAM_QUESTIONS, startExam } from '../core/exam';
import { predictExam } from '../core/stats';
import { NavRow, fmtDate, fmtDuration } from '../ui/common';
import { IconClose } from '../ui/icons';
import type { Nav } from '../App';

export function ExamIntro({ nav }: { nav: Nav }) {
  const s = useAppState();
  const pred = predictExam(s);
  const history = s.exams.slice().reverse();

  const begin = () => {
    update((st) => startExam(st));
    nav.go({ type: 'exam' });
  };

  return (
    <div class="overlay" role="dialog" aria-label="Egzamin próbny">
      <div class="topbar">
        <button class="icon-btn" aria-label="Zamknij" onClick={() => nav.go(null)}><IconClose /></button>
      </div>
      <div class="overlay-body">
        <div class="wrap">
          <header class="large-title" style={{ marginTop: 0 }}>
            <div class="eyebrow">Symulacja testu CBZC</div>
            <h1>Egzamin próbny</h1>
          </header>
          <div class="card rules">
            <div class="rule"><span>📋</span><span><b>{EXAM_QUESTIONS} pytań</b> dobranych proporcjonalnie do wag 12 działów.</span></div>
            <div class="rule"><span>⏱️</span><span><b>40 minut.</b> Czas płynie także po wyjściu z aplikacji, a po upływie egzamin kończy się automatycznie.</span></div>
            <div class="rule"><span>🎯</span><span>Próg zaliczenia: <b>{EXAM_PASS}/{EXAM_QUESTIONS}</b>.</span></div>
            <div class="rule"><span>🛟</span><span><b>{EXAM_LIFELINES} koła 50/50</b> na cały egzamin.</span></div>
            <div class="rule"><span>🔒</span><span>Wynik i poprawne odpowiedzi zobaczysz dopiero po oddaniu. Do tego czasu możesz wracać do pytań i oznaczać je flagą.</span></div>
          </div>
          {pred.confident && (
            <p class="footnote">Prognoza na podstawie Twojej nauki: ok. <b>{pred.score}/40</b>.</p>
          )}

          {history.length > 0 && (
            <>
              <div class="section-h"><h2>Historia</h2><span class="aside">{history.length} {history.length === 1 ? 'podejście' : 'podejść'}</span></div>
              <div class="group">
                {history.slice(0, 10).map((r) => (
                  <NavRow
                    title={<span class="tnum" style={{ fontWeight: 600, color: r.score >= EXAM_PASS ? 'var(--green)' : 'var(--red)' }}>{r.score}/{r.total}</span>}
                    sub={`${fmtDate(r.at)} · ${fmtDuration(r.durationMs)}${r.timedOut ? ' · koniec czasu' : ''}`}
                    value={r.score >= EXAM_PASS ? 'Zdany' : 'Niezdany'}
                    onClick={() => nav.go({ type: 'examResult', rec: r, fresh: false })}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div class="overlay-foot">
        <div class="wrap">
          <button class="btn btn-primary" onClick={begin}>Rozpocznij egzamin</button>
        </div>
      </div>
    </div>
  );
}
