// Feature: GAL-AUTH-ACCOUNT-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")

import type { AuthSchemas, RestClient } from '@/shared/api'
import type { SessionCreatedResponse } from './sessionApi'

/** Registrierungsdaten für einen lokalen Account. */
export type CreateAccountRequest = AuthSchemas['CreateAccountRequest']
/** Bestätigter Account nach erfolgreicher Registrierung (ohne Passwort). */
export type AccountResponse = AuthSchemas['AccountResponse']
/** Zugangsdaten für die Anmeldung. */
export type SessionCredentialsRequest = AuthSchemas['SessionCredentialsRequest']

/**
 * Zugriff auf die serverautoritativen Konto- und Anmeldeendpunkte. Registrierung und
 * Anmeldung laufen ausschließlich über diese Schnittstelle, damit die Endpunktpfade an
 * einer Stelle liegen und im Test leicht ersetzbar sind.
 */
export interface AccountApi {
  /** Legt einen lokalen Account an; das Passwort wird nie in einer Antwort zurückgegeben. */
  register(request: CreateAccountRequest): Promise<AccountResponse>
  /** Prüft Zugangsdaten und liefert bei Erfolg eine Session inklusive Bearer-Token. */
  login(request: SessionCredentialsRequest): Promise<SessionCreatedResponse>
}

const ACCOUNTS_PATH = '/api/v1/auth/accounts'
const SESSIONS_PATH = '/api/v1/auth/sessions'

/** Bindet die Konto- und Anmeldeendpunkte an einen konfigurierten REST-Client. */
export function createAccountApi(client: RestClient): AccountApi {
  return {
    register: (request) => client.post<AccountResponse>(ACCOUNTS_PATH, request),
    login: (request) => client.post<SessionCreatedResponse>(SESSIONS_PATH, request),
  }
}
