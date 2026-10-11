import { test, expect } from '@playwright/test';
import { SHOTS, answer, currentCorrect, expectNoHorizontalOverflow, onboard, watchErrors } from './helpers';



test('onboarding, dashboard i wszystkie zakładki bez błędów (jasny i ciemny)', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.screenshot({ path: `${SHOTS}/01-onboarding.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Dalej' }).click();
  await page.screenshot({ path: `${SHOTS}/02-onboarding-2.png`, animations: 'disabled' });
  await page.getByPlaceholder('Imię lub nick').fill('Kuba');
  await page.getByRole('radio', { name: '20', exact: true }).click();
  await page.getByRole('button', { name: 'Zaczynamy' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kuba');

  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => (window as any).__cbzc.update((s: any) => { s.settings.theme = t; }), theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    for (const [tab, file] of [['Start', 'home'], ['Statystyki', 'stats'], ['Pytania', 'browse'], ['Osiągnięcia', 'ach'], ['Ustawienia', 'settings']] as const) {
      await page.locator('.tabbar').getByRole('button', { name: tab }).click();
      await page.waitForTimeout(150);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `${SHOTS}/10-${file}-${theme}.png`, animations: 'disabled' });
    }
  }
  expect(errors).toEqual([]);
});

test('sesja nauki: 10 pytań, reveal, wyjaśnienie, podsumowanie, statystyki', async ({ page }) => {
  const errors = watchErrors(page);
  await onboard(page, 'Kuba', '10');
  await page.getByRole('button', { name: /Ucz się/ }).click();
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.topbar')).toContainText(`${i + 1}/10`);
    const { id, correct } = await currentCorrect(page);
    expect(seen.has(id), 'pytanie powtórzone w sesji').toBe(false);
    seen.add(id);
    const pick = i % 3 === 0 ? (correct + 1) % 4 : correct; // co trzecie źle
    await answer(page, pick);
    const fb = page.locator('.feedback');
    await expect(fb).toBeVisible();
    if (pick === correct) await expect(fb).toContainText('Dobrze!');
    else {
      await expect(fb).toContainText('Poprawna odpowiedź');
      await expect(page.locator('.answer.correct')).toHaveCount(1);
      await expect(page.locator('.answer.wrong')).toHaveCount(1);
    }
    if (i === 0) await page.screenshot({ path: `${SHOTS}/20-lesson-wrong.png`, animations: 'disabled' });
    if (i === 1) await page.screenshot({ path: `${SHOTS}/21-lesson-correct.png`, animations: 'disabled' });
    // drugi klik w odpowiedź nic nie zmienia
    await page.locator('.answers .answer').nth(correct).click({ force: true });
    await expect(page.locator('.answer.correct')).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: i === 9 ? 'Zakończ' : 'Dalej', exact: true }).click();
  }
  await expect(page.locator('.overlay .ring-center')).toContainText('6/10');
  await page.screenshot({ path: `${SHOTS}/22-summary.png`, fullPage: true, animations: 'disabled' });
  const st = await page.evaluate(() => (window as any).__cbzc.getState());
  expect(st.totals.answered).toBe(10);
  expect(st.totals.sessions).toBe(1);
  expect(st.retry.length).toBe(4);
  expect(st.streak.current).toBe(1); // cel 10 osiągnięty
  expect(st.achievements.first).toBeTruthy();
  await page.getByRole('button', { name: 'Wróć do startu' }).click();
  await expect(page.getByText('4 do poprawy')).toBeVisible();
  await expect(page.locator('.kv').first()).toContainText('1 dzień');
  expect(errors).toEqual([]);
});

test('błędna odpowiedź wraca po ok. 10 pytaniach (przez granicę sesji)', async ({ page }) => {
  await onboard(page);
  const log: string[] = [];
  let target = '';
  for (let session = 0; session < 2; session++) {
    await page.getByRole('button', { name: /Ucz się/ }).click();
    for (let i = 0; i < 10; i++) {
      const { id, correct } = await currentCorrect(page);
      log.push(id);
      if (!target) {
        target = id;
        await answer(page, (correct + 2) % 4);
      } else await answer(page, correct);
      await page.getByRole('button', { name: i === 9 ? 'Zakończ' : 'Dalej', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Wróć do startu' }).click();
  }
  const second = log.indexOf(target, 1);
  expect(second, `sekwencja: ${log.join(',')}`).toBeGreaterThanOrEqual(9);
  expect(second).toBeLessThanOrEqual(11);
});

test('50/50 w nauce wyklucza dwie błędne odpowiedzi', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: /Ucz się/ }).click();
  const { correct } = await currentCorrect(page);
  await page.getByRole('button', { name: 'Koło ratunkowe 50/50' }).click();
  await expect(page.locator('.answer.removed')).toHaveCount(2);
  await expect(page.locator('.answer').nth(correct)).not.toHaveClass(/removed/);
  await page.screenshot({ path: `${SHOTS}/23-lesson-5050.png`, animations: 'disabled' });
  await answer(page, correct);
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.getByRole('button', { name: 'Koło ratunkowe 50/50' })).toBeDisabled();
});

test('egzamin: 40 pytań, 50/50 x3, wznowienie po przeładowaniu, oddanie i wynik', async ({ page }) => {
  const errors = watchErrors(page);
  await onboard(page);
  await page.getByRole('button', { name: /Egzamin próbny/ }).click();
  await page.screenshot({ path: `${SHOTS}/30-exam-intro.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Rozpocznij egzamin' }).click();
  await expect(page.getByRole('timer')).toContainText(/39:5\d|40:00/);
  await page.screenshot({ path: `${SHOTS}/31-exam.png`, animations: 'disabled' });

  // 50/50 trzy razy
  for (let k = 0; k < 3; k++) {
    await page.getByRole('button', { name: 'Koło ratunkowe 50/50' }).click();
    await expect(page.locator('.answer.removed')).toHaveCount(2);
    await page.getByRole('button', { name: 'Następne pytanie' }).click();
  }
  await expect(page.getByRole('button', { name: 'Koło ratunkowe 50/50' })).toBeDisabled();
  await page.getByRole('button', { name: 'Poprzednie pytanie' }).click();
  await page.getByRole('button', { name: 'Poprzednie pytanie' }).click();
  await page.getByRole('button', { name: 'Poprzednie pytanie' }).click();

  // odpowiadamy: 30 poprawnie, 10 źle, flaga na 5.
  for (let i = 0; i < 40; i++) {
    const { correct } = await currentCorrect(page);
    const removed = await page.locator('.answer').evaluateAll((els) => els.map((e) => e.classList.contains('removed')));
    let pick = correct;
    if (i >= 30) pick = [0, 1, 2, 3].find((x) => x !== correct && !removed[x])!;
    await answer(page, pick);
    await expect(page.locator('.answer.selected')).toHaveCount(1);
    if (i === 4) await page.getByRole('button', { name: 'Oznacz pytanie' }).click();
    if (i === 20) {
      // przeładowanie w trakcie: egzamin się wznawia
      await page.reload();
      await expect(page.getByText(/Egzamin w toku/)).toBeVisible();
      await page.getByText(/Egzamin w toku/).click();
      await expect(page.locator('.pill').filter({ hasText: '21/40' })).toBeVisible();
      await expect(page.locator('.answer.selected')).toHaveCount(1);
    }
    if (i < 39) await page.getByRole('button', { name: 'Następne pytanie' }).click();
  }
  await page.getByRole('button', { name: 'Lista pytań' }).click();
  await expect(page.locator('.exam-grid button.answered')).toHaveCount(40);
  await expect(page.locator('.exam-grid button.flag')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/32-exam-grid.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Oddaj egzamin' }).click();
  await page.getByRole('button', { name: 'Oddaj i sprawdź wynik' }).click();
  await expect(page.locator('.result-hero .score')).toHaveText('30');
  await expect(page.getByText('Zaliczony')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/33-exam-result.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('radio', { name: /Błędne \(10\)/ }).click();
  await expect(page.locator('.q-row')).toHaveCount(10);
  await page.locator('.q-row').first().click();
  await expect(page.locator('.opt.correct')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/34-exam-review.png`, animations: 'disabled' });
  const st = await page.evaluate(() => (window as any).__cbzc.getState());
  expect(st.activeExam).toBeNull();
  expect(st.exams.length).toBe(1);
  expect(st.exams[0].lifelinesUsed).toBe(3);
  expect(st.achievements.exampass).toBeTruthy();
  expect(errors).toEqual([]);
});

test('egzamin kończy się automatycznie po upływie czasu (także po powrocie do aplikacji)', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: /Egzamin próbny/ }).click();
  await page.getByRole('button', { name: 'Rozpocznij egzamin' }).click();
  const { correct } = await currentCorrect(page);
  await answer(page, correct);
  // przesuwamy start o 41 minut wstecz
  await page.evaluate(() => (window as any).__cbzc.update((s: any) => { s.activeExam.startedAt -= 41 * 60_000; }));
  await expect(page.locator('.result-hero .score')).toHaveText('1', { timeout: 5000 });
  await expect(page.getByText('koniec czasu')).toBeVisible();

  // drugi przypadek: aplikacja zamknięta w trakcie, czas minął
  await page.getByRole('button', { name: 'Nowy egzamin' }).click();
  await page.getByRole('button', { name: 'Rozpocznij egzamin' }).click();
  await page.getByRole('button', { name: 'Wyjdź z egzaminu' }).click();
  await page.getByRole('button', { name: 'Wróć później' }).click();
  await expect(page.getByText(/Egzamin w toku/)).toBeVisible();
  await page.evaluate(() => (window as any).__cbzc.update((s: any) => { s.activeExam.startedAt -= 45 * 60_000; }));
  await page.reload();
  await expect(page.locator('.result-hero .score')).toBeVisible();
  const st = await page.evaluate(() => (window as any).__cbzc.getState());
  expect(st.exams.length).toBe(2);
  expect(st.exams[1].timedOut).toBe(true);
});

test('powtórka błędów, wybór działu, przeglądarka pytań, ustawienia', async ({ page }) => {
  const errors = watchErrors(page);
  await onboard(page);
  // dział: Bazy danych
  await page.getByRole('button', { name: /Wybierz dział/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Bazy danych i SQL/ }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.q-meta .chip').first()).toContainText('Bazy danych');
    const { correct } = await currentCorrect(page);
    await answer(page, i < 3 ? (correct + 1) % 4 : correct);
    await page.getByRole('button', { name: i === 9 ? 'Zakończ' : 'Dalej', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Wróć do startu' }).click();
  // powtórka błędów: dokładnie 3 pytania
  await page.getByRole('button', { name: /Powtórka błędów/ }).click();
  await expect(page.locator('.topbar')).toContainText('1/3');
  for (let i = 0; i < 3; i++) {
    const { correct } = await currentCorrect(page);
    await answer(page, correct);
    await page.getByRole('button', { name: i === 2 ? 'Zakończ' : 'Dalej', exact: true }).click();
  }
  await expect(page.locator('.overlay .ring-center')).toContainText('3/3');
  await page.getByRole('button', { name: 'Wróć do startu' }).click();

  // przeglądarka: wyszukiwanie bez polskich znaków
  await page.locator('.tabbar').getByRole('button', { name: 'Pytania' }).click();
  await page.getByRole('searchbox', { name: 'Szukaj' }).fill('wezel');
  const n = await page.locator('.q-row').count();
  expect(n).toBeGreaterThan(0);
  await page.getByRole('searchbox', { name: 'Szukaj' }).fill('');
  await page.getByRole('radio', { name: 'Do poprawy' }).click();
  await expect(page.locator('.q-row')).toHaveCount(3);
  await page.locator('.q-row').first().click();
  await expect(page.locator('.opt.correct')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/40-browse-detail.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Gotowe' }).click();

  // ustawienia: motyw, dźwięk, cel, reset
  await page.locator('.tabbar').getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('radio', { name: 'Ciemny' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('switch', { name: 'Dźwięki odpowiedzi' }).click();
  expect(await page.evaluate(() => (window as any).__cbzc.getState().settings.sound)).toBe(false);
  await page.getByRole('radio', { name: '50 pytań' }).click();
  expect(await page.evaluate(() => (window as any).__cbzc.getState().profile.goal)).toBe(50);
  await page.getByRole('button', { name: 'Wyzeruj postęp' }).click();
  await expect(page.getByRole('button', { name: 'Wyzeruj', exact: true })).toBeDisabled();
  await page.getByPlaceholder('RESET').fill('reset');
  await page.getByRole('button', { name: 'Wyzeruj', exact: true }).click();
  const st = await page.evaluate(() => (window as any).__cbzc.getState());
  expect(st.totals.answered).toBe(0);
  expect(st.profile.name).toBe('Kuba');
  expect(st.settings.theme).toBe('dark');
  expect(errors).toEqual([]);
});

test('stan przetrwa przeładowanie; statystyki i osiągnięcia renderują się z danymi', async ({ page }) => {
  const errors = watchErrors(page);
  await onboard(page);
  // symulacja historii nauki z kilku dni
  await page.evaluate(() => {
    const api = (window as any).__cbzc;
    api.update((s: any) => {
      const qs = api.questions;
      qs.forEach((q: any, i: number) => {
        if (i % 2) return;
        const ok = i % 6 !== 0;
        s.q[q.id] = { seen: 2, correct: ok ? 2 : 0, wrong: ok ? 0 : 2, streak: ok ? 2 : 0, lastCorrectSession: 1, lastSeen: i, mastered: ok && i % 4 === 0, timeMs: 8000, timed: 2 };
      });
      const d = new Date();
      for (let k = 0; k < 20; k++) {
        const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - k);
        const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        if (k % 4 !== 3) s.days[key] = { a: 5 + ((k * 7) % 25), c: 4 + ((k * 5) % 15), xp: 50 };
      }
      s.exams = [18, 22, 26, 24, 31].map((sc, k) => ({ at: Date.now() - (5 - k) * 86400000, score: sc, total: 40, durationMs: 1800000, timedOut: false, lifelinesUsed: 1, ids: [], answers: [] }));
      s.xp = 1240;
      s.totals.answered = 300;
    });
  });
  await page.reload();
  await page.locator('.tabbar').getByRole('button', { name: 'Statystyki' }).click();
  await expect(page.getByText('Prognoza egzaminu')).toBeVisible();
  await expect(page.getByText('Najsłabsze tematy')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${SHOTS}/50-stats-full.png`, fullPage: true, animations: 'disabled' });
  await page.locator('.group button.row.with-icon').first().click();
  await page.screenshot({ path: `${SHOTS}/51-stats-module.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Gotowe' }).click();
  await page.locator('.tabbar').getByRole('button', { name: 'Osiągnięcia' }).click();
  await expect(page.locator('.ach:not(.locked)').first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/52-ach.png`, fullPage: true, animations: 'disabled' });
  await page.locator('.tabbar').getByRole('button', { name: 'Start' }).click();
  await page.screenshot({ path: `${SHOTS}/53-home-data.png`, fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('pytania z tabelą SQL i kodem Python wyświetlają się czytelnie', async ({ page }) => {
  const errors = watchErrors(page);
  await onboard(page);
  await page.locator('.tabbar').getByRole('button', { name: 'Pytania' }).click();
  for (const [id, shot] of [['CBZC-221', 'sql'], ['CBZC-222', 'join'], ['CBZC-273', 'python']] as const) {
    await page.getByRole('searchbox', { name: 'Szukaj' }).fill(id);
    await page.locator('.q-row').first().click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.locator('.q-code')).toHaveCount(1);
    if (shot !== 'python') await expect(dlg.locator('.q-table').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/60-q-${shot}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Gotowe' }).click();
  }
  // wcięcia Pythona zachowane w DOM
  await page.getByRole('searchbox', { name: 'Szukaj' }).fill('CBZC-274');
  await page.locator('.q-row').first().click();
  expect(await page.locator('.q-code').textContent()).toContain('    if i == 1:\n        continue');
  // ten sam układ w lekcji (tryb ciemny)
  await page.getByRole('button', { name: 'Gotowe' }).click();
  await page.evaluate(() => (window as any).__cbzc.update((s: any) => { s.settings.theme = 'dark'; }));
  await page.locator('.tabbar').getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: /Wybierz dział/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Bazy danych i SQL/ }).click();
  for (let i = 0; i < 10; i++) {
    if (await page.locator('.overlay .q-table').count()) {
      await page.screenshot({ path: `${SHOTS}/61-lesson-sql-dark.png`, animations: 'disabled' });
      break;
    }
    const { correct } = await currentCorrect(page);
    await answer(page, correct);
    await page.getByRole('button', { name: i === 9 ? 'Zakończ' : 'Dalej', exact: true }).click();
  }
  expect(errors).toEqual([]);
});
