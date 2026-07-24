import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/shared/api'
import { useColonyStore } from './colonyStore'
import type {
  ColonyApi,
  ColonyOverviewResponse,
  EconomySummaryResponse,
  PopulationSummaryResponse,
} from './colonyApi'

const COLONIES_LINK = '/api/v1/campaigns/cmp_1/empires/emp_1/colonies'
const POPULATION_LINK = '/api/v1/campaigns/cmp_1/empires/emp_1/population'
const ECONOMY_LINK = '/api/v1/campaigns/cmp_1/empires/emp_1/economy'

function overview(overrides: Partial<ColonyOverviewResponse> = {}): ColonyOverviewResponse {
  return {
    campaignId: 'cmp_1',
    empireId: 'emp_1',
    stateVersion: 1,
    generatedAt: '2026-07-23T12:00:00Z',
    colonies: [
      {
        colonyId: 'col_home',
        systemId: 'sys_home',
        planetId: 'pln_home',
        isHomeColony: true,
        lifecycleState: 'etabliert',
        specialization: 'neutral',
        planet: {
          category: 'terrestrial',
          size: 'medium',
          knowledgeLevel: 'explored',
          displayNameKey: 'planet.home.name',
          renderKind: 'terrestrial_planet',
        },
        links: { system: '/api/v1/x', population: POPULATION_LINK, economy: ECONOMY_LINK },
      },
    ],
    ...overrides,
  }
}

function population(): PopulationSummaryResponse {
  return {
    campaignId: 'cmp_1',
    empireId: 'emp_1',
    colonyId: 'col_home',
    systemId: 'sys_home',
    stateVersion: 1,
    generatedAt: '2026-07-23T12:00:00Z',
    totalPopulation: 1000000,
    employablePopulation: 600000,
    employedPopulation: 600000,
    unemployedPopulation: 0,
    nonWorkforcePopulation: 400000,
  }
}

function economy(): EconomySummaryResponse {
  return {
    campaignId: 'cmp_1',
    empireId: 'emp_1',
    colonyId: 'col_home',
    systemId: 'sys_home',
    stateVersion: 1,
    generatedAt: '2026-07-23T12:00:00Z',
    essentialSupply: { quantity: 30000, reserved: 0, available: 30000, coverageDays: 30 },
  }
}

function mockApi(overrides: Partial<ColonyApi> = {}): ColonyApi {
  return {
    getColonies: vi.fn(async () => overview()),
    getPopulation: vi.fn(async () => population()),
    getEconomy: vi.fn(async () => economy()),
    ...overrides,
  }
}

describe('colonyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lädt die Kolonieübersicht über die Linkrelation', async () => {
    const store = useColonyStore()
    store.useApi(mockApi())

    await store.loadColonies(COLONIES_LINK)

    expect(store.overviewStatus).toBe('ready')
    expect(store.colonies).toHaveLength(1)
    expect(store.colonies[0].colonyId).toBe('col_home')
  })

  it('stellt einen Übersichtsfehler ohne Kolonien dar', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Nicht gefunden.',
      status: 404,
    })
    const store = useColonyStore()
    store.useApi(mockApi({ getColonies: vi.fn(async () => Promise.reject(failure)) }))

    await store.loadColonies(COLONIES_LINK)

    expect(store.overviewStatus).toBe('error')
    expect(store.overviewError).not.toBeNull()
    expect(store.colonies).toHaveLength(0)
  })

  it('löst den gewählten Planeten zur Kolonie auf und lädt Bevölkerung und Grundversorgung', async () => {
    const api = mockApi()
    const store = useColonyStore()
    store.useApi(api)
    await store.loadColonies(COLONIES_LINK)

    await store.selectPlanet('pln_home')

    expect(store.selectedColony?.colonyId).toBe('col_home')
    expect(store.detailStatus).toBe('ready')
    expect(store.population?.totalPopulation).toBe(1000000)
    expect(store.economy?.essentialSupply.coverageDays).toBe(30)
    expect(api.getPopulation).toHaveBeenCalledWith(POPULATION_LINK)
    expect(api.getEconomy).toHaveBeenCalledWith(ECONOMY_LINK)
  })

  it('kennzeichnet einen bekannten Planeten ohne Kolonie als klaren leeren Zustand', async () => {
    const store = useColonyStore()
    store.useApi(mockApi())
    await store.loadColonies(COLONIES_LINK)

    await store.selectPlanet('pln_other')

    expect(store.selectedColony).toBeNull()
    expect(store.detailStatus).toBe('no-colony')
    expect(store.population).toBeNull()
  })

  it('setzt das Detail bei aufgehobener Auswahl zurück', async () => {
    const store = useColonyStore()
    store.useApi(mockApi())
    await store.loadColonies(COLONIES_LINK)
    await store.selectPlanet('pln_home')

    await store.selectPlanet(null)

    expect(store.selectedPlanetId).toBeNull()
    expect(store.detailStatus).toBe('idle')
    expect(store.population).toBeNull()
    expect(store.economy).toBeNull()
  })

  it('löst eine vor dem Laden gesetzte Deep-Link-Auswahl nach der Übersicht auf', async () => {
    const store = useColonyStore()
    store.useApi(mockApi())

    // Auswahl vor geladener Übersicht (Deep-Link): bleibt zunächst im Ladezustand.
    await store.selectPlanet('pln_home')
    expect(store.detailStatus).toBe('loading')

    await store.loadColonies(COLONIES_LINK)

    expect(store.detailStatus).toBe('ready')
    expect(store.population?.totalPopulation).toBe(1000000)
  })

  it('spiegelt einen Übersichtsfehler in den Detailzustand der Auswahl', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Nicht gefunden.',
      status: 404,
    })
    const store = useColonyStore()
    store.useApi(mockApi({ getColonies: vi.fn(async () => Promise.reject(failure)) }))

    await store.selectPlanet('pln_home')
    await store.loadColonies(COLONIES_LINK)

    expect(store.detailStatus).toBe('error')
    expect(store.detailError).not.toBeNull()
  })

  it('zeigt einen Detailfehler, wenn Bevölkerung oder Grundversorgung fehlschlägt', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'INTERNAL_ERROR',
      message: 'Interner Fehler.',
      status: 500,
    })
    const store = useColonyStore()
    store.useApi(mockApi({ getPopulation: vi.fn(async () => Promise.reject(failure)) }))
    await store.loadColonies(COLONIES_LINK)

    await store.selectPlanet('pln_home')

    expect(store.detailStatus).toBe('error')
    expect(store.detailError).not.toBeNull()
  })
})
