// Feature: GAL-CAMPAIGN-CREATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns)

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toUiError, type UiError } from '@/shared/api'
import type { CampaignApi, CampaignResponse, CreateCampaignRequest } from './campaignApi'

/** Ladezustand der Kampagnenliste; `ready` wird erst nach einer Serverantwort gesetzt. */
export type CampaignListStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Kampagnenliste und Kampagnenerstellung des Clients. Der Store kapselt die serverautoritativen
 * Kampagnen-Endpunkte, hält keine eigenen Spielregeln und übernimmt Serverwerte unverändert. Die
 * konkrete API wird nach dem Bootstrap injiziert; Tests setzen eine Mock-API.
 */
export const useCampaignStore = defineStore('campaign', () => {
  let api: CampaignApi | null = null

  const campaigns = ref<CampaignResponse[]>([])
  const listStatus = ref<CampaignListStatus>('idle')
  const listError = ref<UiError | null>(null)
  const createPending = ref(false)
  const createError = ref<UiError | null>(null)

  /** Verbindet den Store mit den serverautoritativen Kampagnen-Endpunkten. */
  function useApi(next: CampaignApi): void {
    api = next
  }

  function requireApi(): CampaignApi {
    if (!api) throw new Error('Kampagnen-API wurde nicht initialisiert (useApi fehlt).')
    return api
  }

  /** Lädt die für den Account sichtbaren Kampagnen; markiert den Zustand erst nach Serverantwort. */
  async function load(): Promise<void> {
    const client = requireApi()
    listStatus.value = 'loading'
    listError.value = null
    try {
      const response = await client.list()
      campaigns.value = response.campaigns
      listStatus.value = 'ready'
    } catch (error) {
      listError.value = toUiError(error)
      listStatus.value = 'error'
    }
  }

  /**
   * Erstellt eine Kampagne und gibt die serverbestätigte Kampagne zurück. Der Idempotenzschlüssel
   * verhindert, dass ein wiederholter Versuch eine zweite Kampagne erzeugt. Fehler werden geworfen,
   * damit das Formular Feld- und Allgemeinfehler darstellen kann.
   */
  async function create(
    request: CreateCampaignRequest,
    idempotencyKey: string,
  ): Promise<CampaignResponse> {
    const client = requireApi()
    createPending.value = true
    createError.value = null
    try {
      const created = await client.create(request, idempotencyKey)
      mergeCampaign(created)
      return created
    } catch (error) {
      createError.value = toUiError(error)
      throw error
    } finally {
      createPending.value = false
    }
  }

  /** Übernimmt eine erstellte Kampagne idempotent, damit eine Wiederholung keinen Duplikateintrag erzeugt. */
  function mergeCampaign(campaign: CampaignResponse): void {
    const index = campaigns.value.findIndex((c) => c.campaignId === campaign.campaignId)
    if (index === -1) campaigns.value = [campaign, ...campaigns.value]
    else campaigns.value = campaigns.value.map((c, i) => (i === index ? campaign : c))
  }

  return {
    campaigns,
    listStatus,
    listError,
    createPending,
    createError,
    useApi,
    load,
    create,
  }
})

export type CampaignStore = ReturnType<typeof useCampaignStore>
