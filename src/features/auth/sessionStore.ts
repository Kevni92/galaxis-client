// Feature: GAL-AUTH-SESSION-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isApiError, type SessionProvider } from '@/shared/api'
import { createTokenStorage, type TokenStorage } from './tokenStorage'
import type { SessionApi, SessionCreatedResponse, SessionResponse } from './sessionApi'

/**
 * Lebenszyklus des Anmeldestatus:
 * - `unknown`: noch nicht serverseitig geprüft (Startzustand, auch bei vorhandenem Token),
 * - `anonymous`: geprüft, keine gültige Session,
 * - `authenticated`: vom Server bestätigte Session,
 * - `error`: Prüfung wegen eines nicht-authentifizierungsbedingten Fehlers unbestimmt.
 */
export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated' | 'error'

/** Für die UI relevante Identitätsdaten einer bestätigten Session (ohne Token). */
export interface SessionIdentity {
  readonly sessionId: SessionResponse['sessionId']
  readonly accountId: SessionResponse['accountId']
  readonly email: SessionResponse['email']
  readonly expiresAt: SessionResponse['expiresAt']
}

function toIdentity(session: SessionResponse): SessionIdentity {
  return {
    sessionId: session.sessionId,
    accountId: session.accountId,
    email: session.email,
    expiresAt: session.expiresAt,
  }
}

/**
 * Zentraler Anmeldezustand des Clients. Der Store hält Token und Sessionstatus, bestätigt
 * eine Session ausschließlich serverseitig und setzt sie bei `401` kontrolliert zurück.
 * Er enthält keine Spielregeln; fachlicher Zustand bleibt beim Server.
 */
export const useSessionStore = defineStore('session', () => {
  const tokens: TokenStorage = createTokenStorage()

  const status = ref<SessionStatus>('unknown')
  const identity = ref<SessionIdentity | null>(null)
  // Sichtbare Kennung des letzten Fehlers im Zustand `error`, z. B. für Wiederholungshinweise.
  const lastErrorCode = ref<string | null>(null)

  // Die konkrete API wird nach dem Bootstrap injiziert; Tests setzen eine Mock-API.
  let api: SessionApi | null = null
  // Verhindert parallele Prüfungen und dedupliziert gleichzeitige Guard-Aufrufe.
  let pendingVerify: Promise<SessionStatus> | null = null

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isKnown = computed(() => status.value !== 'unknown')
  /** True, sobald überhaupt ein Token vorliegt – ohne damit eine Anmeldung zu behaupten. */
  const hasToken = computed(() => tokens.get() !== undefined)

  /** Verbindet den Store mit den serverautoritativen Session-Endpunkten. */
  function useApi(next: SessionApi): void {
    api = next
  }

  function requireApi(): SessionApi {
    if (!api) throw new Error('Session-API wurde nicht initialisiert (useApi fehlt).')
    return api
  }

  /**
   * Token-Provider für den REST-Client. Liefert das aktuelle Token, ohne den Status zu ändern,
   * damit die Startprüfung das persistierte Token überhaupt mitsenden kann.
   */
  const sessionProvider: SessionProvider = {
    getToken: () => tokens.get(),
  }

  /** Übernimmt ein extern (z. B. nach Anmeldung) ausgegebenes Token als bestätigte Session. */
  function adoptSession(created: SessionCreatedResponse): void {
    tokens.set(created.token)
    identity.value = toIdentity(created)
    lastErrorCode.value = null
    status.value = 'authenticated'
  }

  /** Verwirft Token und geschützten Zustand und geht in den regulären Zustand `anonymous`. */
  function reset(): void {
    tokens.clear()
    identity.value = null
    lastErrorCode.value = null
    status.value = 'anonymous'
  }

  /**
   * Setzt den Status auf `error`, ohne das Token zu verwerfen. Ein vorübergehender Fehler
   * (Netzwerk, `500`) darf keine Abmeldung auslösen, damit eine spätere Prüfung greifen kann.
   */
  function markError(errorCode: string): void {
    identity.value = null
    lastErrorCode.value = errorCode
    status.value = 'error'
  }

  /**
   * Kontrollierter Rücksetzpunkt für `401`-Antworten beliebiger geschützter Aufrufe:
   * Token und geschützter Zustand werden entfernt, ohne den Server erneut zu kontaktieren.
   */
  function handleUnauthorized(): void {
    reset()
  }

  /**
   * Bestätigt die Session serverseitig. Ohne Token gilt der Nutzer sofort als `anonymous`.
   * `401` setzt kontrolliert auf `anonymous` (Token verworfen); andere Fehler ergeben `error`.
   */
  async function verify(): Promise<SessionStatus> {
    if (pendingVerify) return pendingVerify

    pendingVerify = (async () => {
      if (tokens.get() === undefined) {
        reset()
        return status.value
      }
      try {
        const session = await requireApi().getCurrentSession()
        identity.value = toIdentity(session)
        lastErrorCode.value = null
        status.value = 'authenticated'
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          reset()
        } else {
          markError(isApiError(error) ? error.code : 'UNKNOWN')
        }
      }
      return status.value
    })()

    try {
      return await pendingVerify
    } finally {
      pendingVerify = null
    }
  }

  /** Führt die Startprüfung nur aus, wenn der Status noch `unknown` ist. */
  async function ensureVerified(): Promise<SessionStatus> {
    if (status.value !== 'unknown') return status.value
    return verify()
  }

  /**
   * Meldet die Session ab. Der geschützte Zustand wird immer entfernt – auch wenn der
   * Server-Aufruf fehlschlägt –, damit lokal kein angemeldeter Zustand zurückbleibt.
   */
  async function logout(): Promise<void> {
    const hadToken = tokens.get() !== undefined
    try {
      if (hadToken) await requireApi().deleteCurrentSession()
    } catch {
      // Auch bei Serverfehler wird lokal abgemeldet; ein verwaistes Token bleibt nicht bestehen.
    } finally {
      reset()
    }
  }

  return {
    status,
    identity,
    lastErrorCode,
    isAuthenticated,
    isKnown,
    hasToken,
    sessionProvider,
    useApi,
    adoptSession,
    handleUnauthorized,
    verify,
    ensureVerified,
    logout,
  }
})

export type SessionStore = ReturnType<typeof useSessionStore>
