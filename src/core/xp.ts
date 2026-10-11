export const XP = {
  correct: 10,
  correctHelped: 5,
  wrong: 1,
  sessionDone: 10,
  perfectSession: 15,
  examPerPoint: 3,
  examPass: 30,
};

export const RANKS = [
  'Rekrut', 'Kadet', 'Posterunkowy', 'Sierżant', 'Aspirant', 'Detektyw',
  'Komisarz', 'Nadkomisarz', 'Inspektor', 'Nadinspektor', 'Generał',
];

/** Próg XP potrzebny do osiągnięcia poziomu L (L >= 1). Poziom 1 = 0 XP. */
export function xpForLevel(level: number): number {
  const l = level - 1;
  return 60 * l + 20 * l * l; // 0, 80, 200, 360, 560, ...
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  const rank = RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 3))];
  return { level, rank, into: xp - from, need: to - from, pct: (xp - from) / (to - from) };
}
