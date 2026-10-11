// Lekkie wykresy SVG (bez bibliotek).
import { weekdayShort, addDays } from '../core/dates';

/** Słupki dzienne: wysokość = odpowiedzi, zielona część = poprawne. */
export function DailyBars({ data }: { data: { day: string; a: number; c: number }[] }) {
  const W = 340;
  const H = 120;
  const pad = 18;
  const max = Math.max(5, ...data.map((d) => d.a));
  const bw = (W - 4) / data.length;
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H + pad}`} role="img" aria-label="Odpowiedzi w ostatnich dniach">
      <line x1="0" x2={W} y1={H} y2={H} stroke="var(--sep)" stroke-width="1" />
      {data.map((d, i) => {
        const x = 2 + i * bw + bw * 0.18;
        const w = bw * 0.64;
        const h = (d.a / max) * (H - 14);
        const hc = (d.c / max) * (H - 14);
        return (
          <g>
            {d.a > 0 && <rect x={x} y={H - h} width={w} height={h} rx="3" fill="var(--red)" opacity="0.35" />}
            {d.c > 0 && <rect x={x} y={H - hc} width={w} height={hc} rx="3" fill="var(--green)" />}
            {d.a > 0 && data.length <= 14 && (
              <text x={x + w / 2} y={H - h - 4} text-anchor="middle">{d.a}</text>
            )}
            {(data.length <= 14 || i % 5 === 0) && (
              <text x={x + w / 2} y={H + 13} text-anchor="middle">{weekdayShort(d.day)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Linia wyników egzaminów z progiem zaliczenia. */
export function ExamLine({ scores, pass, total = 40 }: { scores: number[]; pass: number; total?: number }) {
  const W = 340;
  const H = 130;
  const px = 22;
  const py = 10;
  const n = scores.length;
  const x = (i: number) => (n === 1 ? W / 2 : px + (i * (W - px - 10)) / (n - 1));
  const y = (v: number) => py + (1 - v / total) * (H - py * 2);
  const path = scores.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wyniki egzaminów">
      {[0, 10, 20, 30, 40].map((v) => (
        <g>
          <line x1={px} x2={W} y1={y(v)} y2={y(v)} stroke="var(--sep)" stroke-width="0.6" />
          <text x="0" y={y(v) + 3}>{v}</text>
        </g>
      ))}
      <line x1={px} x2={W} y1={y(pass)} y2={y(pass)} stroke="var(--orange)" stroke-width="1.5" stroke-dasharray="4 4" />
      <text x={W - 2} y={y(pass) - 4} text-anchor="end" style={{ fill: 'var(--orange)' }}>próg {pass}</text>
      {n > 1 && <path d={path} fill="none" stroke="var(--tint)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />}
      {scores.map((v, i) => (
        <circle cx={x(i)} cy={y(v)} r="4.5" fill={v >= pass ? 'var(--green)' : 'var(--red)'} stroke="var(--card)" stroke-width="2" />
      ))}
    </svg>
  );
}

/** Kalendarz aktywności (ostatnie `weeks` tygodni, kolumny = tygodnie). */
export function Heatmap({ days, today, weeks = 15, goal }: { days: Record<string, { a: number }>; today: string; weeks?: number; goal: number }) {
  // ostatnia kolumna kończy się na dziś; wyrównanie do poniedziałku
  const dow = (new Date(today + 'T12:00:00').getDay() + 6) % 7; // 0 = pn
  const start = addDays(today, -(weeks - 1) * 7 - dow);
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const future = d > today;
    const a = days[d]?.a ?? 0;
    const level = a === 0 ? 0 : a >= goal ? 3 : a >= goal / 2 ? 2 : 1;
    const bg = future ? 'transparent' : ['var(--fill)', 'rgba(52,199,89,.35)', 'rgba(52,199,89,.65)', 'var(--green)'][level];
    cells.push(<i title={`${d}: ${a}`} style={{ background: bg }} />);
  }
  return <div class="heat" aria-label="Kalendarz aktywności">{cells}</div>;
}
