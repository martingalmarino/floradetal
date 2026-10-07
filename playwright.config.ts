import { defineConfig, devices } from '@playwright/test';

// Uses the locally installed Google Chrome by default (no browser download needed).
// Set PW_CHANNEL="" to use Playwright's bundled Chromium (after `npx playwright install chromium`).
const channel = process.env.PW_CHANNEL ?? 'chrome';
const PORT = 4322;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: 'mobile-320', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 720 }, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `npx astro build && npx astro preview --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
