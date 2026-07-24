// Feature: GAL-API-A1-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns/{campaignId}/state)

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toUiError, type UiError } from '@/shared/api'
import type { CampaignApi, CampaignStateResponse } from './campaignApi'

/** Ladezustand des Kampagnenzustands; `ready` wird erst nach einer Serverantwort gesetzt. */
export type CampaignStateStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Kompakter Kampagnenzustand der ausgewählten Kampagne (Game-Shell-Bootstrap). Der Store lädt den
 * wissensgefilterten Zustand nach Kampagnen-ID, merkt sich Zustandsversion und ETag und stellt die
 * serverseitigen Linkrelationen für die weitere Navigation bereit. Er bildet keine Spielregeln nach
 * und übernimmt Serverwerte unverändert; unbekannte Zusatzfelder stören nicht.
 */
export const useCampaignStateStore = defineStore('campaignState', () => {
  let api: CampaignApi | null = null

  const campaignId = ref<string | null>(null)
  const state = ref<CampaignStateResponse | null>(null)
  const etag = ref<string | undefined>(undefined)
  const status = ref<CampaignStateStatus>('idle')
  const error = ref<UiError | null>(null)

  /** Zustandsversion der zuletzt geladenen, reichsspezifischen Sicht. */
  const stateVersion = computed(() => state.value?.stateVersion ?? null)
  /** Kontrolliertes Reich; Grundlage der Navigation zu Reich, System und Kolonie. */
  const controlledEmpire = computed(() => state.value?.controlledEmpire ?? null)
  /** Stabile Linkrelationen; Detailressourcen folgen diesen Links statt selbst gebauter URLs. */
  const links = computed<Readonly<Record<string, string>>>(() => state.value?.links ?? {})

  /** Verbindet den Store mit den serverautoritativen Kampagnen-Endpunkten. */
  function useApi(next: CampaignApi): void {
    api = next
  }

  function requireApi(): CampaignApi {
    if (!api) throw new Error('Kampagnen-API wurde nicht initialisiert (useApi fehlt).')
    return api
  }

  /**
   * Lädt den kompakten Zustand einer Kampagne. Ein Wechsel der Kampagne verwirft zuerst den alten
   * Zustand, damit keine fremden Daten sichtbar bleiben; `ready` gilt erst nach der Serverantwort.
   */
  async function loadState(id: string): Promise<void> {
    const client = requireApi()
    if (id !== campaignId.value) {
      state.value = null
      etag.value = undefined
    }
    campaignId.value = id
    status.value = 'loading'
    error.value = null
    try {
      const result = await client.getState(id)
      state.value = result.state
      etag.value = result.etag
      status.value = 'ready'
    } catch (cause) {
      // Fehler (auch fehlender Zugriff) werden ohne interne Details als UiError dargestellt.
      error.value = toUiError(cause)
      status.value = 'error'
    }
  }

  /** Lädt den zuletzt gewählten Kampagnenzustand erneut (z. B. nach einem Fehler). */
  async function reload(): Promise<void> {
    if (campaignId.value) await loadState(campaignId.value)
  }

  return {
    campaignId,
    state,
    etag,
    status,
    error,
    stateVersion,
    controlledEmpire,
    links,
    useApi,
    loadState,
    reload,
  }
})

export type CampaignStateStore = ReturnType<typeof useCampaignStateStore>
