import { defineConfig, devices } from '@playwright/test'

// Feature: GAL-CLIENT-A0-E2E-001
// Fachlicher Ablauf: docs/roadmap/IMPLEMENTATION-ROADMAP.md (Abschnitt 5.6 "A0-Abnahmedemo")
// Teststrategie: docs/TESTING.md – "Nach Merge auf main": Client gegen echten Server.
//
// Eigene Konfiguration statt playwright.config.ts, damit der schnelle gemockte PR-Smoke
// unverändert bleibt: dieser Lauf braucht einen echten Server samt PostgreSQL im Hintergrund
// (siehe scripts/run-e2e-a0.mjs) und läuft deshalb separat über `pnpm test:e2e:a0`.
const PORT = 4174
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e-a0',
  outputDir: './test-results-a0',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-a0' }]]
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
  // Baut den Produktions-Build und bedient ihn mit dem Server-Proxy aus vite.config.ts;
  // der echte Server muss vor diesem Lauf bereits erreichbar sein.
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
