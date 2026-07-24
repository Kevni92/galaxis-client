// Feature: GAL-CLIENT-STATE-001
// Öffentliche Schnittstelle des Connection-Moduls: Health-Anbindung und Verbindungszustand.

export { createHealthApi } from './healthApi'
export type { HealthApi, LiveHealthResponse, ReadinessResult, ReadinessStatus } from './healthApi'
export { useConnectionStore } from './connectionStore'
export type { ConnectionStatus, ConnectionStore, ConnectionApiOptions } from './connectionStore'
export { HEALTH_API_KEY } from './healthInjection'
export { default as ConnectionBanner } from './ConnectionBanner.vue'
// `HealthPanel` bleibt bewusst außerhalb der Barrel, damit die reine Entwicklungsanzeige
// per Lazy-Import geladen wird und nicht in den Standardpfad gerät.
