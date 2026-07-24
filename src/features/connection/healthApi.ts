// Feature: GAL-CLIENT-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Tag "Health", /health/live, /health/ready)

import { isApiError, type AuthSchemas, type RestClient } from '@/shared/api'

/** Antwort der Livenessprüfung; der Prozess kann HTTP-Anfragen bedienen. */
export type LiveHealthResponse = AuthSchemas['LiveHealthResponse']

/** Vereinheitlichtes Ergebnis der Readinessprüfung. */
export type ReadinessStatus = 'ready' | 'not_ready'

export interface ReadinessResult {
  readonly status: ReadinessStatus
  readonly correlationId?: string
}

/**
 * Zugriff auf die technischen Health-Endpunkte. Die Endpunktpfade liegen an einer Stelle und
 * sind im Test leicht ersetzbar. Health ist ungeschützt und benötigt kein Bearer-Token.
 */
export interface HealthApi {
  /** Prüft die Erreichbarkeit; ein Transportfehler bedeutet „nicht erreichbar". */
  getLiveness(): Promise<LiveHealthResponse>
  /**
   * Prüft die Bereitschaft. Der vertragliche `503`-Fall wird als reguläres `not_ready`
   * aufgelöst; echte Transportfehler (Netzwerk, Timeout) werden weitergereicht.
   */
  getReadiness(): Promise<ReadinessResult>
}

const LIVE_PATH = '/health/live'
const READY_PATH = '/health/ready'

/** Bindet die Health-Endpunkte an einen konfigurierten REST-Client. */
export function createHealthApi(client: RestClient): HealthApi {
  return {
    getLiveness: () => client.get<LiveHealthResponse>(LIVE_PATH),
    getReadiness: async () => {
      try {
        const body = await client.get<AuthSchemas['ReadyHealthResponse']>(READY_PATH)
        return { status: 'ready', correlationId: body.correlationId }
      } catch (error) {
        // 503 ist laut Vertrag die reguläre „nicht bereit"-Antwort, kein Verbindungsfehler.
        if (isApiError(error) && error.status === 503) {
          return { status: 'not_ready', correlationId: error.correlationId }
        }
        throw error
      }
    },
  }
}
