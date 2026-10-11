import type { Question } from '../data/questions';
import { LETTERS, LEVEL_NAMES, MODULES } from '../data/modules';
import type { ComponentChildren } from 'preact';

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
      <h2 class="q-text">{q.text}</h2>
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
      <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.35 }}>{q.text}</p>
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
