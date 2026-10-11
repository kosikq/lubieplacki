import type { Question } from '../data/questions';
import { LETTERS, LEVEL_NAMES, MODULES } from '../data/modules';
import type { ComponentChildren } from 'preact';
import { parseQuestionText } from '../core/qtext';

/** Treść pytania z zachowaniem tabel i kodu. */
export function QText({ text, class: cls }: { text: string; class?: string }) {
  const blocks = parseQuestionText(text);
  return (
    <div class={cls} role="heading" aria-level={2}>
      {blocks.map((b) =>
        b.kind === 'text' ? (
          <p class="q-p">{b.text}</p>
        ) : b.kind === 'code' ? (
          <pre class="q-code"><code>{b.text}</code></pre>
        ) : (
          <div class="q-table-wrap">
            <table class="q-table">
              <thead><tr>{b.head.map((h) => <th>{h}</th>)}</tr></thead>
              <tbody>{b.rows.map((r) => <tr>{r.map((c) => <td>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}

export type TileState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim' | 'removed';

export function QuestionCard({ q, states, onPick, disabled, extraChip, animate }: {
  q: Question;
  states: TileState[];
  onPick: (i: number) => void;
  disabled?: boolean;
  extraChip?: ComponentChildren;
  animate?: (number | null)[]; // [pop, shake]
}) {
  const m = MODULES[q.mod];
  return (
    <div>
      <div class="q-meta">
        <span class="chip"><span>{m.icon}</span>{m.short}</span>
        <span class="chip">{LEVEL_NAMES[q.level]}</span>
        {extraChip}
      </div>
      <QText class="q-text" text={q.text} />
      <div class="answers" role="group" aria-label="Odpowiedzi">
        {q.options.map((o, i) => {
          const st = states[i];
          const anim = animate?.[0] === i ? ' pop' : animate?.[1] === i ? ' shake' : '';
          return (
            <button
              class={`answer${st !== 'idle' ? ` ${st}` : ''}${anim}`}
              disabled={disabled || st === 'removed'}
              aria-pressed={st === 'selected'}
              aria-label={`Odpowiedź ${LETTERS[i]}: ${o}`}
              onClick={() => onPick(i)}
            >
              <span class="letter">{LETTERS[i]}</span>
              <span class="txt">{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Statyczny podgląd pytania z zaznaczeniem poprawnej i (opcjonalnie) wybranej odpowiedzi. */
export function QuestionReview({ q, chosen }: { q: Question; chosen?: number | null }) {
  return (
    <div>
      <div class="q-meta">
        <span class="chip"><span>{MODULES[q.mod].icon}</span>{MODULES[q.mod].short}</span>
        <span class="chip">{LEVEL_NAMES[q.level]}</span>
        <span class="chip">{q.id}</span>
      </div>
      <QText class="q-text sm" text={q.text} />
      <div class="opt-list">
        {q.options.map((o, i) => (
          <div class={`opt${i === q.correct ? ' correct' : chosen === i ? ' wrong' : ''}`}>
            <b>{LETTERS[i]}</b>
            <span>{o}</span>
          </div>
        ))}
      </div>
      {chosen === null && <p class="muted" style={{ fontSize: 14, marginBottom: 8 }}>Brak odpowiedzi.</p>}
      <p class="expl">{q.expl}</p>
      {q.source && <p class="muted" style={{ fontSize: 13, marginTop: 8 }}>Źródło: {q.source}</p>}
    </div>
  );
}
