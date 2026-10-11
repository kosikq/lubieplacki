export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Deterministyczny generator (testy). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: Rng = defaultRng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function weightedPick<T>(items: T[], weight: (t: T) => number, rng: Rng = defaultRng): T {
  let total = 0;
  const ws = items.map((it) => {
    const w = Math.max(0, weight(it));
    total += w;
    return w;
  });
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Dwie losowe błędne odpowiedzi do usunięcia kołem 50/50. */
export function fiftyFifty(correct: number, rng: Rng = defaultRng): number[] {
  const wrong = [0, 1, 2, 3].filter((i) => i !== correct);
  return shuffle(wrong, rng).slice(0, 2).sort();
}
