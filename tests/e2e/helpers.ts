import { expect, type Page } from '@playwright/test';

export const SHOTS = 'screenshots';

/** Zbiera błędy konsoli i nieobsłużone wyjątki strony. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function onboard(page: Page, name = 'Kuba', goal = '10') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByPlaceholder('Imię lub nick').fill(name);
  await page.getByRole('radio', { name: goal, exact: true }).click();
  await page.getByRole('button', { name: 'Zaczynamy' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
}

/** Indeks poprawnej odpowiedzi dla pytania aktualnie na ekranie. */
export async function currentCorrect(page: Page): Promise<{ id: string; correct: number }> {
  const text = (await page.locator('.q-text').first().textContent())!;
  return page.evaluate((t) => {
    const strip = (s: string) => s.replace(/[\s|]/g, '');
    const q = (window as any).__cbzc.questions.find((x: any) => strip(x.text) === strip(t));
    return { id: q.id, correct: q.correct };
  }, text);
}

export async function answer(page: Page, idx: number) {
  await page.locator('.answers .answer').nth(idx).click();
}

/** Brak poziomego przewijania strony (żaden element nie wystaje poza ekran). */
export async function expectNoHorizontalOverflow(page: Page) {
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const bad: string[] = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // elementy w przewijanych poziomo kontenerach są OK
      if ((el as HTMLElement).closest('.chips-scroll')) return;
      if (r.right > w + 1 || r.left < -1) bad.push(`${el.tagName}.${(el as HTMLElement).className} ${Math.round(r.left)}..${Math.round(r.right)}`);
    });
    return bad.slice(0, 5);
  });
  expect(over, 'elementy wystające poza ekran').toEqual([]);
}
