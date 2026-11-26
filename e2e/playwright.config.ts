import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const CI = !!process.env.CI;

/**
 * End-to-end tests run against the production build (what GitHub Pages serves),
 * on the two phones that matter: an iPhone (Safari/WebKit) and a Pixel (Chrome).
 */
// Paths here are relative to this e2e/ folder; reports still land at the repo root.
export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never', outputFolder: '../playwright-report' }]] : [['list'], ['html', { open: 'on-failure', outputFolder: '../playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Pin the timezone so the 4am day rollover and AM/PM/night modes don't depend on the machine.
    timezoneId: 'America/Vancouver',
    locale: 'en-CA',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iPhone', use: { ...devices['iPhone 15'] } },
    { name: 'Pixel', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    cwd: '..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
});
