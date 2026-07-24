// Feature: GAL-COLONY-HOME-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (/colonies, /population, /economy)
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toUiError, type UiError } from '@/shared/api'
import type {
  ColonyApi,
  ColonyOverviewResponse,
  ColonySummary,
  EconomySummaryResponse,
  PopulationSummaryResponse,
} from './colonyApi'

/** Ladezustand der Kolonieübersicht; `ready` gilt erst nach einer Serverantwort. */
export type ColonyOverviewStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Zustand des Detailfensters zum gewählten Planeten. `no-colony` kennzeichnet einen bekannten Planeten
 * ohne sichtbare Kolonie als klaren, leeren Zustand; kein Fehler.
 */
export type ColonyDetailStatus = 'idle' | 'loading' | 'ready' | 'error' | 'no-colony'

/**
 * Lädt und hält die wissensgefilterte Kolonieübersicht sowie das Detail (Bevölkerung, Grundversorgung)
 * der zum gewählten Planeten gehörenden Kolonie. Es werden ausschließlich serverseitig gelieferte Werte
 * über Linkrelationen geladen; der Client leitet keine Kolonie, Zugehörigkeit oder Kennzahl selbst ab.
 * Die Planetenauswahl ist reiner Clientzustand und wird von der Shell gesetzt.
 */
export const useColonyStore = defineStore('colony', () => {
  let api: ColonyApi | null = null

  const overview = ref<ColonyOverviewResponse | null>(null)
  const overviewStatus = ref<ColonyOverviewStatus>('idle')
  const overviewError = ref<UiError | null>(null)

  const selectedPlanetId = ref<string | null>(null)
  const population = ref<PopulationSummaryResponse | null>(null)
  const economy = ref<EconomySummaryResponse | null>(null)
  const detailStatus = ref<ColonyDetailStatus>('idle')
  const detailError = ref<UiError | null>(null)

  const colonies = computed<ColonySummary[]>(() => overview.value?.colonies ?? [])

  /** Kolonie des aktuell gewählten Planeten; `null`, solange keine passende bekannt ist. */
  const selectedColony = computed<ColonySummary | null>(
    () => colonies.value.find((colony) => colony.planetId === selectedPlanetId.value) ?? null,
  )

  function useApi(next: ColonyApi): void {
    api = next
  }

  function requireApi(): ColonyApi {
    if (!api) throw new Error('Kolonie-API wurde nicht initialisiert (useApi fehlt).')
    return api
  }

  /**
   * Lädt die bekannte Kolonieübersicht über die Linkrelation aus dem Kampagnenzustand. Eine bereits
   * gesetzte Planetenauswahl (z. B. aus einem Deep-Link) wird nach dem Laden aufgelöst.
   */
  async function loadColonies(coloniesLink: string): Promise<void> {
    const client = requireApi()
    overviewStatus.value = 'loading'
    overviewError.value = null
    try {
      overview.value = await client.getColonies(coloniesLink)
      overviewStatus.value = 'ready'
    } catch (cause) {
      overview.value = null
      overviewError.value = toUiError(cause)
      overviewStatus.value = 'error'
    }
    if (selectedPlanetId.value !== null) await selectPlanet(selectedPlanetId.value)
  }

  async function loadDetail(colony: ColonySummary): Promise<void> {
    const client = requireApi()
    const populationLink = colony.links.population
    const economyLink = colony.links.economy
    detailStatus.value = 'loading'
    detailError.value = null
    population.value = null
    economy.value = null
    try {
      const [pop, econ] = await Promise.all([
        populationLink ? client.getPopulation(populationLink) : Promise.resolve(null),
        economyLink ? client.getEconomy(economyLink) : Promise.resolve(null),
      ])
      population.value = pop
      economy.value = econ
      detailStatus.value = 'ready'
    } catch (cause) {
      detailError.value = toUiError(cause)
      detailStatus.value = 'error'
    }
  }

  /**
   * Wählt den Planeten des Detailfensters. Ohne geladene Übersicht bleibt der Detailzustand `loading`
   * bzw. spiegelt einen Übersichtsfehler; ein bekannter Planet ohne Kolonie wird als `no-colony`
   * gekennzeichnet. Unbekannte oder `null`-Auswahl setzt das Detail zurück.
   */
  async function selectPlanet(planetId: string | null): Promise<void> {
    selectedPlanetId.value = planetId
    population.value = null
    economy.value = null
    detailError.value = null
    if (planetId === null) {
      detailStatus.value = 'idle'
      return
    }
    if (overviewStatus.value === 'idle' || overviewStatus.value === 'loading') {
      detailStatus.value = 'loading'
      return
    }
    if (overviewStatus.value === 'error') {
      detailStatus.value = 'error'
      detailError.value = overviewError.value
      return
    }
    const colony = selectedColony.value
    if (!colony) {
      detailStatus.value = 'no-colony'
      return
    }
    await loadDetail(colony)
  }

  /** Lädt das Detail der aktuellen Auswahl erneut (z. B. nach einem Fehler). */
  async function reloadDetail(): Promise<void> {
    const colony = selectedColony.value
    if (colony) await loadDetail(colony)
  }

  return {
    overview,
    overviewStatus,
    overviewError,
    colonies,
    selectedPlanetId,
    selectedColony,
    population,
    economy,
    detailStatus,
    detailError,
    useApi,
    loadColonies,
    selectPlanet,
    reloadDetail,
  }
})

export type ColonyStore = ReturnType<typeof useColonyStore>
