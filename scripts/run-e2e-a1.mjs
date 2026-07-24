// Feature: GAL-CLIENT-A1-E2E-001
// Orchestrierung: startet den echten A1-Serverlauf über die wiederverwendbare A0-Runnerbasis.

process.env.GALAXIS_E2E_NAME = 'a1'
process.env.GALAXIS_E2E_CONFIG = 'playwright.a1.config.ts'

await import('./run-e2e-a0.mjs')
