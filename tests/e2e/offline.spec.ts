import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

test('po pierwszym załadowaniu aplikacja działa offline (service worker)', async ({ page, context }) => {
  await onboard(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // poczekaj aż SW przejmie kontrolę i zapisze precache
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kuba');
  await page.getByRole('button', { name: /Ucz się/ }).click();
  await expect(page.locator('.q-text')).toBeVisible();
  await context.setOffline(false);
});
