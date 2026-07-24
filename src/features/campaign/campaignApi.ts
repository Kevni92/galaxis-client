// Feature: GAL-CAMPAIGN-CREATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns)

import type { GameSchemas, RestClient } from '@/shared/api'

/** Minimale Eingabe zum Erstellen einer A1-Singleplayer-Kampagne. */
export type CreateCampaignRequest = GameSchemas['CreateCampaignRequest']
/** Serverautoritative Kampagnengrunddaten (Status, Zeitprofil, Balancing- und Zustandsversion). */
export type CampaignResponse = GameSchemas['CampaignResponse']
/** Liste der für den Account sichtbaren Kampagnen. */
export type CampaignListResponse = GameSchemas['CampaignListResponse']

/**
 * Zugriff auf die serverautoritativen Kampagnen-Endpunkte. Auflisten und Erstellen laufen
 * ausschließlich über diese Schnittstelle, damit die Endpunktpfade an einer Stelle liegen und
 * im Test leicht ersetzbar sind.
 */
export interface CampaignApi {
  /** Liefert nur Kampagnen, auf die der aktuelle Account zugreifen darf. */
  list(): Promise<CampaignListResponse>
  /**
   * Erstellt atomar eine A1-Kampagne. Der Idempotenzschlüssel dedupliziert Wiederholungen
   * desselben Versuchs serverseitig; identische Wiederholungen liefern dieselbe Kampagne.
   */
  create(request: CreateCampaignRequest, idempotencyKey: string): Promise<CampaignResponse>
}

const CAMPAIGNS_PATH = '/api/v1/campaigns'

/** Bindet die Kampagnen-Endpunkte an einen konfigurierten REST-Client. */
export function createCampaignApi(client: RestClient): CampaignApi {
  return {
    list: () => client.get<CampaignListResponse>(CAMPAIGNS_PATH),
    create: (request, idempotencyKey) =>
      client.post<CampaignResponse>(CAMPAIGNS_PATH, request, {
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
  }
}
