// Feature: GAL-COLONY-HOME-001
// Öffentliche Schnittstelle des Kolonie-Moduls: modales Heimatplanet-/Koloniedetail und API-Anbindung.

export { createColonyApi } from './colonyApi'
export type {
  ColonyApi,
  ColonyOverviewResponse,
  ColonySummary,
  ColonyPlanetSummary,
  PopulationSummaryResponse,
  EconomySummaryResponse,
} from './colonyApi'
export { useColonyStore } from './colonyStore'
export type { ColonyStore, ColonyOverviewStatus, ColonyDetailStatus } from './colonyStore'
export { default as ColonyDetailWindow } from './ColonyDetailWindow.vue'
