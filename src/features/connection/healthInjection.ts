// Feature: GAL-CLIENT-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Tag "Health")

import type { InjectionKey } from 'vue'
import type { HealthApi } from './healthApi'

/** Bereitstellungsschlüssel für die Health-API, damit die Entwicklungsanzeige sie ohne Prop erhält. */
export const HEALTH_API_KEY: InjectionKey<HealthApi> = Symbol('galaxis.healthApi')
