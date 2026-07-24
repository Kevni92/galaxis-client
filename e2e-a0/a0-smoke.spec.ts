import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'

// Feature: GAL-CLIENT-A0-E2E-001
// Fachlicher Ablauf: docs/roadmap/IMPLEMENTATION-ROADMAP.md (Abschnitt 5.6 "A0-Abnahmedemo")
// REST-Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")
//
// Läuft gegen einen echten, lokal gestarteten Server samt PostgreSQL (scripts/run-e2e-a0.mjs),
// nicht gegen gemockte Antworten wie e2e/auth.spec.ts. Deckt den vollständigen A0-Ablauf ab:
// registrieren, anmelden, Session serverseitig prüfen, geschützte Seite öffnen, abmelden,
// erneuter Zugriff wird wieder auf die Anmeldemaske verwiesen.
test('A0: Registrierung, Anmeldung, Sessionprüfung und Abmeldung gegen den echten Server', async ({
  page,
}) => {
  const email = `smoke-${randomUUID()}@example.test`
  const password = 'correct-horse-battery-staple'

  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)

  // Registrieren: Account erstellen, ohne automatisch angemeldet zu werden.
  await page.getByTestId('tab-register').click()
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('form-notice')).toBeVisible()
  await expect(page.getByTestId('tab-login')).toHaveAttribute('aria-selected', 'true')

  // Anmelden: führt auf die geschützte Startseite.
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('submit-button').click()
  await expect(page).toHaveURL('/')
  await expect(page.getByTestId('account-email')).toHaveText(email)
  await expect(page.getByTestId('logout-button')).toBeVisible()

  // Session serverseitig prüfen: ein Reload verifiziert das Bearer-Token erneut gegen den Server.
  await page.reload()
  await expect(page.getByTestId('account-email')).toHaveText(email)

  // Abmelden: Token wird verworfen, die Maske erscheint wieder.
  await page.getByTestId('logout-button').click()
  await expect(page).toHaveURL(/\/login/)

  // Erneuter Zugriff auf die geschützte Seite wird ohne gültige Session wieder auf die Maske verwiesen.
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})
