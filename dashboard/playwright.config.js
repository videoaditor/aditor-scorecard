import { defineConfig, devices } from '@playwright/test'

/**
 * E2E-first, hermetic Playwright config for aditor-scorecard.
 *
 * The suite drives the *built* SPA served by `vite preview` (the same bundle a
 * real user loads at score.aditor.ai). Every external boundary is faked at the
 * network layer by tests/fixtures/mockBackend.js, and a hard-rail catch-all
 * aborts + fails the test on any request to a non-localhost host that isn't an
 * explicitly-registered mock. See AGENTS.md for the full test contract.
 *
 * Determinism:
 *  - timezoneId is pinned to Europe/Berlin to match useScorecard's toLocalDate,
 *    so date math (current-week, month/quarter defaults) is machine-independent.
 *  - Each spec pins page.clock before navigating (fixtures are aligned to Feb 2026).
 *  - retries: 0 - a gate-blocking T1 test must not flake-pass on a retry.
 */
export default defineConfig({
  testDir: './tests',
  // Fixtures live under tests/fixtures and are plain data/helpers, not specs.
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    timezoneId: 'Europe/Berlin',
    locale: 'en-US',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
