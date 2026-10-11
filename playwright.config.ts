import { defineConfig, devices } from '@playwright/test';

// iPhone 17/18 Pro: 402x874 pt, @3x
const iphone = {
  ...devices['iPhone 15 Pro'],
  viewport: { width: 402, height: 874 },
  screen: { width: 402, height: 874 },
  deviceScaleFactor: 3,
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'webkit-iphone', use: { ...iphone, browserName: 'webkit' }, testIgnore: /offline.spec/ },
    { name: 'chromium-offline', use: { ...iphone, browserName: 'chromium' }, testMatch: /offline\.spec/ },
  ],
});
