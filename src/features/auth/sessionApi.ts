// Feature: GAL-AUTH-SESSION-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")

import type { AuthSchemas, RestClient } from '@/shared/api'

/** Bestätigte Sessionidentität, wie sie der Server bei gültigem Token liefert. */
export type SessionResponse = AuthSchemas['SessionResponse']
/** Antwort einer erfolgreichen Anmeldung inklusive ausgegebenem Bearer-Token. */
export type SessionCreatedResponse = AuthSchemas['SessionCreatedResponse']

/**
 * Zugriff auf die serverautoritativen Session-Endpunkte. Der Store spricht ausschließlich
 * über diese Schnittstelle mit dem Server, damit die Endpunktpfade an einer Stelle liegen
 * und im Test leicht ersetzbar sind.
 */
export interface SessionApi {
  /** Prüft das aktuelle Bearer-Token; `401` bedeutet keine gültige Session. */
  getCurrentSession(): Promise<SessionResponse>
  /** Beendet die aktuelle Session serverseitig. */
  deleteCurrentSession(): Promise<void>
}

const CURRENT_SESSION_PATH = '/api/v1/auth/session'
const CURRENT_SESSION_DELETE_PATH = '/api/v1/auth/sessions/current'

/** Bindet die Session-Endpunkte an einen konfigurierten REST-Client. */
export function createSessionApi(client: RestClient): SessionApi {
  return {
    getCurrentSession: () => client.get<SessionResponse>(CURRENT_SESSION_PATH),
    deleteCurrentSession: () => client.del<void>(CURRENT_SESSION_DELETE_PATH),
  }
}
