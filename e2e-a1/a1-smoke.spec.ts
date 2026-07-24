import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

// Feature: GAL-CLIENT-A1-E2E-001
// Fachliche Grundlage: docs/roadmap/IMPLEMENTATION-ROADMAP.md (Abschnitte 6.3–6.4)
// REST-Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml
//
// Kritischer A1-Ablauf gegen einen echten Server: Registrierung, Anmeldung, Kampagnenerstellung,
// bekannte 3D-Systemansicht, zugängliche Planetenauswahl, modales Detail und Reload-Wiederherstellung.
test('A1: Heimatplanet und modales Detail über Reload wiederherstellen', async ({ page }) => {
  const email = `a1-smoke-${randomUUID()}@example.test`
  const password = 'correct-horse-battery-staple'

  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)

  await page.getByTestId('tab-register').click()
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('form-notice')).toBeVisible()

  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('account-email')).toHaveText(email)

  await page.getByRole('link', { name: 'Kampagnen' }).click()
  await expect(page.getByTestId('campaign-list-view')).toBeVisible()

  await page.getByTestId('seed-input').fill('42')
  await page.getByTestId('time-profile-input').fill('standard')
  await page.getByTestId('create-submit').click()

  await expect(page).toHaveURL(/\/campaigns\/[^/]+\/systems\/[^/]+/)
  await expect(page.getByTestId('campaign-view-id')).toBeVisible()
  await expect(page.getByTestId('home-system-objects')).toBeVisible()

  const planet = page.locator('[data-kind="planet"][data-homeworld-eligible="true"]')
  await expect(planet).toBeVisible()
  const planetTestId = await planet.getAttribute('data-testid')
  expect(planetTestId).toMatch(/^object-/)

  await planet.click()
  await expect(page.getByTestId('campaign-colony-detail')).toBeVisible()
  await expect(page.getByTestId('modal-title')).toBeVisible()
  await expect(page.getByTestId('planet-name')).toBeVisible()
  await expect(page.getByTestId('colony-id')).toBeVisible()
  await expect(page.getByTestId(planetTestId!)).toHaveAttribute('aria-selected', 'true')

  const detailUrl = page.url()
  expect(detailUrl).toContain('/systems/')
  expect(detailUrl).toContain('object=')
  expect(detailUrl).toContain('window=colony')
  expect(detailUrl).toContain('tab=overview')

  await page.reload()
  await expect(page.getByTestId('home-system-objects')).toBeVisible()
  await expect(page.getByTestId('campaign-colony-detail')).toBeVisible()
  await expect(page.getByTestId('modal-title')).toBeVisible()
  await expect(page.getByTestId('colony-id')).toBeVisible()
  await expect(page.getByTestId(planetTestId!)).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(detailUrl)
})
