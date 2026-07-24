import { defineConfig, devices } from '@playwright/test'

// Feature: GAL-CLIENT-A1-E2E-001
// Teststrategie: docs/TESTING.md – echter Serverlauf für den kritischen A1-Gesamtablauf.
// Die A1-Konfiguration bleibt vom schnellen gemockten PR-Smoke und vom A0-Smoke getrennt.
const PORT = 4175
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e-a1',
  outputDir: './test-results-a1',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-a1' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_E2E_API_PROXY_TARGET: process.env.GALAXIS_E2E_SERVER_URL ?? 'http://127.0.0.1:3000',
    },
  },
})
