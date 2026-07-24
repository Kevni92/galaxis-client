import { test, expect } from '@playwright/test'

// Kritischer Nutzerablauf (docs/TESTING.md, GAL-AUTH-ACCOUNT-001): Anmeldung über die Maske
// führt auf die geschützte Startseite. Der Session-Endpunkt wird gemockt, damit der Smoke
// ohne echten Server läuft und nur den Client-Ablauf prüft.
test('Anmeldung führt auf die geschützte Startseite', async ({ page }) => {
  await page.route('**/api/v1/auth/sessions', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'ses_smoke',
        accountId: 'acc_smoke',
        email: 'captain@example.test',
        token: 'tok_smoke',
        createdAt: '2026-07-24T12:00:00Z',
        expiresAt: '2026-07-25T12:00:00Z',
      }),
    })
  })

  // Zugriff auf die geschützte Startseite leitet zunächst auf die Maske um.
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)

  await page.getByTestId('email-input').fill('captain@example.test')
  await page.getByTestId('password-input').fill('correct-horse-battery-staple')
  await page.getByTestId('submit-button').click()

  await expect(page.getByRole('heading', { name: 'Galaxis Client' })).toBeVisible()
  await expect(page.getByTestId('account-email')).toHaveText('captain@example.test')
  await expect(page.getByTestId('logout-button')).toBeVisible()
})
