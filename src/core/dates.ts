// Daty jako lokalne napisy YYYY-MM-DD. Różnice dni liczone na UTC z części daty,
// więc zmiana czasu (DST) nie przesuwa wyniku.

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toUTC(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

export function addDays(key: string, delta: number): string {
  const t = new Date(toUTC(key) + delta * 86400000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
export function weekdayShort(key: string): string {
  return WEEKDAYS[new Date(toUTC(key)).getUTCDay()];
}
