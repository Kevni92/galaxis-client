import { test, expect } from '@playwright/test'

// Kritischer Smoke-Test (docs/TESTING.md): die App-Shell lädt und rendert die Startansicht.
test('App-Shell öffnet die Startansicht', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-shell-topbar')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Galaxis Client' })).toBeVisible()
  await expect(page.getByTestId('api-base-url')).toBeVisible()
})

test('unbekannter Pfad zeigt die Auffangansicht', async ({ page }) => {
  await page.goto('/gibt-es-nicht')

  await expect(page.getByTestId('not-found-view')).toBeVisible()
})
