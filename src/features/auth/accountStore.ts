// Feature: GAL-AUTH-ACCOUNT-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")

import { defineStore } from 'pinia'
import {
  type AccountApi,
  type AccountResponse,
  type CreateAccountRequest,
  type SessionCredentialsRequest,
} from './accountApi'
import { useSessionStore } from './sessionStore'

/**
 * Anmelde- und Registrierungsablauf des Clients. Der Store kapselt die serverautoritativen
 * Konto-Endpunkte und übergibt eine erfolgreiche Anmeldung an den Session-Store. Er hält
 * bewusst keinen Formular- oder Ladezustand; diesen führen die Masken lokal, damit
 * Zugangsdaten nicht länger als nötig im Speicher verbleiben.
 */
export const useAccountStore = defineStore('account', () => {
  // Die konkrete API wird nach dem Bootstrap injiziert; Tests setzen eine Mock-API.
  let api: AccountApi | null = null

  /** Verbindet den Store mit den serverautoritativen Konto-Endpunkten. */
  function useApi(next: AccountApi): void {
    api = next
  }

  function requireApi(): AccountApi {
    if (!api) throw new Error('Konto-API wurde nicht initialisiert (useApi fehlt).')
    return api
  }

  /** Legt einen lokalen Account an, ohne ihn anzumelden. */
  async function register(request: CreateAccountRequest): Promise<AccountResponse> {
    return requireApi().register(request)
  }

  /** Meldet an und übernimmt die ausgegebene Session als bestätigten Anmeldezustand. */
  async function login(request: SessionCredentialsRequest): Promise<void> {
    const created = await requireApi().login(request)
    useSessionStore().adoptSession(created)
  }

  return { useApi, register, login }
})

export type AccountStore = ReturnType<typeof useAccountStore>
