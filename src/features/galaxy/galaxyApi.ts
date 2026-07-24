// Feature: GAL-GALAXY-HOME-VIEW-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (/campaigns/{id}/galaxy, /systems/{systemId})

import type { GameSchemas, RestClient } from '@/shared/api'

/** Wissensgefilterte A1-Galaxieübersicht (bekannte Systeme und Verbindungen). */
export type GalaxyOverviewResponse = GameSchemas['GalaxyOverviewResponse']
/** Wissensgefiltertes Sternensystem mit sichtbaren Sternen und Planeten. */
export type SystemDetailResponse = GameSchemas['SystemDetailResponse']
/** Sichtbarer Stern eines Systems. */
export type StarObject = GameSchemas['StarObject']
/** Sichtbarer Planet eines Systems. */
export type PlanetObject = GameSchemas['PlanetObject']

/**
 * Zugriff auf die wissensgefilterten Galaxie- und Systemressourcen. Die Pfade stammen als stabile
 * Linkrelationen aus vorherigen Antworten; der Client baut keine Detail-URLs selbst zusammen.
 */
export interface GalaxyApi {
  /** Lädt die bekannte Galaxieübersicht über die Linkrelation aus dem Kampagnenzustand. */
  getGalaxy(galaxyLink: string): Promise<GalaxyOverviewResponse>
  /** Lädt ein bekanntes Sternensystem über die Linkrelation aus der Galaxieübersicht. */
  getSystem(systemLink: string): Promise<SystemDetailResponse>
}

/** Bindet die Galaxie- und Systemressourcen an einen konfigurierten REST-Client. */
export function createGalaxyApi(client: RestClient): GalaxyApi {
  return {
    getGalaxy: (galaxyLink) => client.get<GalaxyOverviewResponse>(galaxyLink),
    getSystem: (systemLink) => client.get<SystemDetailResponse>(systemLink),
  }
}
