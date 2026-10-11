// Podział treści pytania na bloki: proza, tabela, kod (SQL/Python).
// W bazie tabele i kod są zapisane w osobnych liniach — bez tego podziału
// wszystko zlewało się w jeden akapit, a kod Pythona tracił wcięcia.

export type QBlock =
  | { kind: 'text'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'code'; text: string };

const SQL = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\b/i;
/** Linia prozy: zaczyna się wielką literą, kończy na : ? . i nie wygląda na kod. */
const PROSE = /^[A-ZĄĆĘŁŃÓŚŹŻ"„(][^|=]*[:?.]$/;

type Line = { kind: 'text' | 'table' | 'code' | 'blank'; raw: string };

function classify(raw: string): Line {
  const t = raw.trim();
  if (!t) return { kind: 'blank', raw };
  if (t.includes('|')) return { kind: 'table', raw };
  if (SQL.test(t)) return { kind: 'code', raw };
  if (PROSE.test(t) && !/^\s/.test(raw)) return { kind: 'text', raw };
  return { kind: 'code', raw };
}

const cells = (row: string) => row.split('|').map((c) => c.trim());

export function parseQuestionText(text: string): QBlock[] {
  if (!text.includes('\n')) return [{ kind: 'text', text }];
  const lines = text.split('\n').map(classify);
  // pusta linia między dwiema liniami kodu należy do kodu (np. odstęp po definicji funkcji)
  for (let i = 1; i < lines.length - 1; i++) {
    if (lines[i].kind !== 'blank') continue;
    const prev = lines.slice(0, i).reverse().find((l) => l.kind !== 'blank');
    const next = lines.slice(i + 1).find((l) => l.kind !== 'blank');
    if (prev?.kind === 'code' && next?.kind === 'code') lines[i] = { kind: 'code', raw: '' };
  }
  const blocks: QBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const kind = lines[i].kind;
    if (kind === 'blank') {
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && lines[j].kind === kind) j++;
    const group = lines.slice(i, j).map((l) => l.raw);
    if (kind === 'table') {
      const [head, ...rows] = group.map(cells);
      blocks.push({ kind: 'table', head, rows });
    } else if (kind === 'code') {
      blocks.push({ kind: 'code', text: group.join('\n').replace(/\s+$/, '') });
    } else {
      blocks.push({ kind: 'text', text: group.map((g) => g.trim()).join(' ') });
    }
    i = j;
  }
  return blocks;
}

/** Wersja jednowierszowa (listy, podglądy). */
export function flatQuestionText(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}
