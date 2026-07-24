// Feature: GAL-CLIENT-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Tag "Health", Abschnitt "Fehlerformat")

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toUiError, withSafeRetry, type UiError } from '@/shared/api'
import type { HealthApi } from './healthApi'

/**
 * Verbindungszustand des Clients gegenüber dem Server:
 * - `unknown`: noch nicht geprüft (Startzustand),
 * - `checking`: eine Prüfung läuft,
 * - `online`: der Server ist erreichbar,
 * - `offline`: der Server ist nicht erreichbar (Netzwerk/Timeout),
 * - `error`: unerwarteter Fehler bei der Prüfung.
 *
 * Der Zustand trennt einen Serverausfall bewusst von einer nicht bestehenden Anmeldung; letztere
 * bleibt Sache des Session-Stores.
 */
export type ConnectionStatus = 'unknown' | 'checking' | 'online' | 'offline' | 'error'

export interface ConnectionApiOptions {
  /** Injizierbare Wartefunktion für Wiederholungen; Standard nutzt echte Zeit. */
  sleep?: (ms: number) => Promise<void>
}

// Eine einzelne zusätzliche, sichere Wiederholung glättet kurze Verbindungsaussetzer, ohne die
// Offline-Anzeige spürbar zu verzögern.
const LIVENESS_RETRIES = 1
const LIVENESS_RETRY_DELAY_MS = 500

/**
 * Zentraler Verbindungszustand. Leitet die Erreichbarkeit ausschließlich aus der Livenessprüfung
 * und dem einheitlichen `ApiError` ab; Spielregeln werden nicht nachgebildet. Die Livenessabfrage
 * ist eine sichere Abfrage (GET) und darf begrenzt automatisch wiederholt werden; ein manueller
 * Retry bleibt jederzeit möglich, ohne dass jemals ein Befehl wiederholt wird.
 */
export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('unknown')
  const lastError = ref<UiError | null>(null)

  let api: HealthApi | null = null
  let sleep: ConnectionApiOptions['sleep']
  // Dedupliziert gleichzeitige Prüfungen, z. B. Startprüfung und manueller Retry.
  let pendingCheck: Promise<ConnectionStatus> | null = null

  const isOnline = computed(() => status.value === 'online')
  const isOffline = computed(() => status.value === 'offline')
  const isChecking = computed(() => status.value === 'checking')

  /** Verbindet den Store mit den Health-Endpunkten. */
  function useApi(next: HealthApi, options: ConnectionApiOptions = {}): void {
    api = next
    sleep = options.sleep
  }

  function requireApi(): HealthApi {
    if (!api) throw new Error('Health-API wurde nicht initialisiert (useApi fehlt).')
    return api
  }

  /**
   * Prüft die Erreichbarkeit über die Livenessabfrage. Ein Netzwerk- oder Timeout-Fehler ergibt
   * `offline`, jeder andere Fehler `error`. Läuft bereits eine Prüfung, wird deren Ergebnis geteilt.
   */
  async function check(): Promise<ConnectionStatus> {
    if (pendingCheck) return pendingCheck

    status.value = 'checking'
    pendingCheck = (async () => {
      try {
        await withSafeRetry(() => requireApi().getLiveness(), {
          method: 'GET',
          retries: LIVENESS_RETRIES,
          delayMs: LIVENESS_RETRY_DELAY_MS,
          sleep,
        })
        lastError.value = null
        status.value = 'online'
      } catch (error) {
        const ui = toUiError(error)
        lastError.value = ui
        status.value = ui.kind === 'network' || ui.kind === 'timeout' ? 'offline' : 'error'
      }
      return status.value
    })()

    try {
      return await pendingCheck
    } finally {
      pendingCheck = null
    }
  }

  return {
    status,
    lastError,
    isOnline,
    isOffline,
    isChecking,
    useApi,
    check,
  }
})

export type ConnectionStore = ReturnType<typeof useConnectionStore>
