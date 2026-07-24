// Feature: GAL-COLONY-HOME-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (/empires/{empireId}/colonies, /population, /economy)

import type { GameSchemas, RestClient } from '@/shared/api'

/** Wissensgefilterte Kolonieübersicht eines Reiches (inklusive Heimatkolonie). */
export type ColonyOverviewResponse = GameSchemas['ColonyOverviewResponse']
/** Einzelne sichtbare Kolonie mit Planetgrunddaten und Linkrelationen. */
export type ColonySummary = GameSchemas['ColonySummary']
/** Planetgrunddaten aus Koloniesicht. */
export type ColonyPlanetSummary = GameSchemas['ColonyPlanetSummary']
/** Aggregierte Startbevölkerung der Heimatkolonie. */
export type PopulationSummaryResponse = GameSchemas['PopulationSummaryResponse']
/** Bestand und Reichweite der A1-Grundversorgung der Heimatkolonie. */
export type EconomySummaryResponse = GameSchemas['EconomySummaryResponse']

/**
 * Zugriff auf die wissensgefilterten Kolonie-, Bevölkerungs- und Grundversorgungsressourcen. Die Pfade
 * stammen als stabile Linkrelationen aus vorherigen Antworten; der Client baut keine Detail-URLs selbst.
 */
export interface ColonyApi {
  /** Lädt die bekannte Kolonieübersicht über die Linkrelation aus dem Kampagnenzustand. */
  getColonies(coloniesLink: string): Promise<ColonyOverviewResponse>
  /** Lädt die Bevölkerungszusammenfassung über die Linkrelation der Kolonie. */
  getPopulation(populationLink: string): Promise<PopulationSummaryResponse>
  /** Lädt die Grundversorgungszusammenfassung über die Linkrelation der Kolonie. */
  getEconomy(economyLink: string): Promise<EconomySummaryResponse>
}

/** Bindet die Kolonieressourcen an einen konfigurierten REST-Client. */
export function createColonyApi(client: RestClient): ColonyApi {
  return {
    getColonies: (coloniesLink) => client.get<ColonyOverviewResponse>(coloniesLink),
    getPopulation: (populationLink) => client.get<PopulationSummaryResponse>(populationLink),
    getEconomy: (economyLink) => client.get<EconomySummaryResponse>(economyLink),
  }
}
