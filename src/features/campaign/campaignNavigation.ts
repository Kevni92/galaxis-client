// Feature: GAL-CLIENT-A1-NAV-001
// Fachliche Grundlage: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md
// UI-Vertrag: docs/contracts/ui/raumansichten-auswahl-und-kontextaktionen.md (Detailfenster)

export type DetailWindowId = 'colony'
export type DetailTabId = 'overview' | 'population' | 'supply'

const DETAIL_TABS: readonly DetailTabId[] = ['overview', 'population', 'supply']

export function isDetailWindow(value: unknown): value is DetailWindowId {
  return value === 'colony'
}

export function isDetailTab(value: unknown): value is DetailTabId {
  return typeof value === 'string' && DETAIL_TABS.includes(value as DetailTabId)
}

export function detailQuery(
  window: DetailWindowId,
  tab: DetailTabId,
): {
  window: DetailWindowId
  tab: DetailTabId
} {
  return { window, tab }
}
