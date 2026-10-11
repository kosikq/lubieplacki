import { describe, expect, it } from 'vitest';
import { parseQuestionText } from '../../src/core/qtext';
import { BY_ID, QUESTIONS } from '../../src/data/questions';

const text = (id: string) => BY_ID.get(id)!.text;

describe('parseQuestionText', () => {
  it('zwykłe pytanie = jeden blok prozy', () => {
    expect(parseQuestionText(text('CBZC-001'))).toEqual([{ kind: 'text', text: text('CBZC-001') }]);
  });

  it('SQL z tabelą: proza, tabela, proza, kod', () => {
    const b = parseQuestionText(text('CBZC-221'));
    expect(b.map((x) => x.kind)).toEqual(['text', 'table', 'text', 'code']);
    const t = b[1] as { head: string[]; rows: string[][] };
    expect(t.head).toEqual(['id', 'sprzedawca', 'produkt']);
    expect(t.rows.length).toBe(5);
    expect(t.rows[3]).toEqual(['4', 'Kowalski', 'Telefon']);
    expect((b[3] as { text: string }).text).toMatch(/^SELECT .* HAVING COUNT\(\*\) > 2;$/);
  });

  it('dwie tabele (JOIN)', () => {
    const b = parseQuestionText(text('CBZC-222'));
    expect(b.map((x) => x.kind)).toEqual(['text', 'table', 'text', 'table', 'text', 'code']);
    expect((b[0] as { text: string }).text).toBe('Dane są dwie tabele. Tabela "Klienci":');
  });

  it('Python: wcięcia zachowane, pusta linia w środku kodu nie rozbija bloku', () => {
    const b = parseQuestionText(text('CBZC-273'));
    expect(b.map((x) => x.kind)).toEqual(['text', 'code']);
    const code = (b[1] as { text: string }).text;
    expect(code).toContain('def dodaj(a, b):\n    wynik = a + b\n    return wynik\n\nx = 5');
    const b2 = parseQuestionText(text('CBZC-274'));
    expect((b2[1] as { text: string }).text).toContain('    if i == 1:\n        continue');
  });

  it('każde pytanie wieloliniowe: nic nie ginie, kod/tabela wykryte', () => {
    const multi = QUESTIONS.filter((q) => q.text.includes('\n'));
    expect(multi.length).toBe(14);
    for (const q of multi) {
      const b = parseQuestionText(q.text);
      expect(b.some((x) => x.kind === 'code'), q.id).toBe(true);
      expect(b[0].kind, q.id).toBe('text');
      // wszystkie niepuste znaki zachowane
      const strip = (s: string) => s.replace(/[\s|]/g, '');
      const joined = b.map((x) => (x.kind === 'table' ? [x.head, ...x.rows].flat().join('') : x.text)).join('');
      expect(strip(joined), q.id).toBe(strip(q.text));
    }
  });
});
