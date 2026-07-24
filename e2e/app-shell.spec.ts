import { test, expect } from '@playwright/test'

// Kritischer Smoke-Test (docs/TESTING.md): die geschützte Startseite leitet ohne Session auf
// die Anmeldemaske um, die App-Shell bleibt dabei sichtbar.
test('geschützte Startseite leitet ohne Session auf die Anmeldemaske', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId('app-shell-topbar')).toBeVisible()
  await expect(page.getByTestId('auth-view')).toBeVisible()
})

test('unbekannter Pfad zeigt die Auffangansicht', async ({ page }) => {
  await page.goto('/gibt-es-nicht')

  await expect(page.getByTestId('not-found-view')).toBeVisible()
})
