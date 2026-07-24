import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/shared/api'
import { useHomeSystemStore } from './homeSystemStore'
import type { GalaxyApi, GalaxyOverviewResponse, SystemDetailResponse } from './galaxyApi'

const SYSTEM_LINK = '/api/v1/campaigns/cmp_1/systems/sys_home'

function galaxy(overrides: Partial<GalaxyOverviewResponse> = {}): GalaxyOverviewResponse {
  return {
    campaignId: 'cmp_1',
    stateVersion: 1,
    generatedAt: '2026-07-23T12:00:00Z',
    startSystemId: 'sys_home',
    knownSystems: [
      {
        systemId: 'sys_home',
        regionId: 'reg_core',
        knowledgeLevel: 'explored',
        displayNameKey: 'system.home.name',
        galaxyPosition: { x: 0, y: 0, z: 0 },
        renderKind: 'yellow_star_system',
        starCount: 1,
        planetCount: 1,
        links: { self: SYSTEM_LINK },
      },
    ],
    knownConnections: [],
    ...overrides,
  }
}

function system(overrides: Partial<SystemDetailResponse> = {}): SystemDetailResponse {
  return {
    campaignId: 'cmp_1',
    stateVersion: 1,
    generatedAt: '2026-07-23T12:00:00Z',
    systemId: 'sys_home',
    regionId: 'reg_core',
    knowledgeLevel: 'explored',
    displayNameKey: 'system.home.name',
    stars: [
      {
        starId: 'str_home',
        objectType: 'star',
        systemId: 'sys_home',
        knowledgeLevel: 'explored',
        displayNameKey: 'star.home.name',
        localPosition: { x: 0, y: 0 },
        renderKind: 'yellow_star',
        starClass: 'G',
        links: { self: SYSTEM_LINK },
      },
    ],
    planets: [
      {
        planetId: 'pln_home',
        objectType: 'planet',
        systemId: 'sys_home',
        knowledgeLevel: 'explored',
        displayNameKey: 'planet.home.name',
        localPosition: { x: 120.5, y: -44 },
        renderKind: 'terrestrial_planet',
        category: 'terrestrial',
        size: 'medium',
        homeworldEligible: true,
        links: { self: SYSTEM_LINK },
      },
    ],
    links: { self: SYSTEM_LINK },
    ...overrides,
  }
}

function mockApi(overrides: Partial<GalaxyApi> = {}): GalaxyApi {
  return {
    getGalaxy: vi.fn(async () => galaxy()),
    getSystem: vi.fn(async () => system()),
    ...overrides,
  }
}

describe('useHomeSystemStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('wirft ohne initialisierte API einen erklärenden Fehler', async () => {
    await expect(useHomeSystemStore().loadFromGalaxy('/galaxy')).rejects.toThrow(/useApi/)
  })

  it('folgt den Linkrelationen von der Galaxie zum Heimatsystem', async () => {
    const api = mockApi()
    const store = useHomeSystemStore()
    store.useApi(api)

    await store.loadFromGalaxy('/api/v1/campaigns/cmp_1/galaxy')

    expect(api.getGalaxy).toHaveBeenCalledWith('/api/v1/campaigns/cmp_1/galaxy')
    expect(api.getSystem).toHaveBeenCalledWith(SYSTEM_LINK)
    expect(store.status).toBe('ready')
  })

  it('stellt nur bekannte Objekte samt autoritativer XY-Position bereit', async () => {
    const store = useHomeSystemStore()
    store.useApi(mockApi())

    await store.loadFromGalaxy('/galaxy')

    expect(store.objects).toEqual([
      {
        id: 'str_home',
        kind: 'star',
        displayNameKey: 'star.home.name',
        knowledgeLevel: 'explored',
        x: 0,
        y: 0,
        renderKind: 'yellow_star',
      },
      {
        id: 'pln_home',
        kind: 'planet',
        displayNameKey: 'planet.home.name',
        knowledgeLevel: 'explored',
        x: 120.5,
        y: -44,
        renderKind: 'terrestrial_planet',
      },
    ])
    expect(store.sceneObjects).toHaveLength(2)
  })

  it('funktioniert bei genau einem bekannten System ohne Planeten', async () => {
    const store = useHomeSystemStore()
    store.useApi(mockApi({ getSystem: vi.fn(async () => system({ planets: [] })) }))

    await store.loadFromGalaxy('/galaxy')

    expect(store.status).toBe('ready')
    expect(store.objects.map((o) => o.id)).toEqual(['str_home'])
  })

  it('toleriert unbekannte Zusatzfelder im System', async () => {
    const withExtra = { ...system(), futureField: 5 } as SystemDetailResponse
    const store = useHomeSystemStore()
    store.useApi(mockApi({ getSystem: vi.fn(async () => withExtra) }))

    await store.loadFromGalaxy('/galaxy')

    expect(store.status).toBe('ready')
    expect(store.objects).toHaveLength(2)
  })

  it('stellt ein nicht sichtbares System als leeren, sicheren Zustand dar', async () => {
    const store = useHomeSystemStore()
    store.useApi(mockApi({ getGalaxy: vi.fn(async () => galaxy({ knownSystems: [] })) }))

    await store.loadFromGalaxy('/galaxy')

    expect(store.status).toBe('empty')
    expect(store.system).toBeNull()
  })

  it('lädt nur ein angefordertes, bekanntes System und errät keine unbekannte ID', async () => {
    const api = mockApi()
    const store = useHomeSystemStore()
    store.useApi(api)

    await store.loadFromGalaxy('/galaxy', 'sys_unknown')

    expect(store.status).toBe('empty')
    expect(api.getSystem).not.toHaveBeenCalled()
  })

  it('stellt einen fehlenden Systemzugriff ohne Informationsleck dar', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Die angeforderte Ressource wurde nicht gefunden.',
      status: 404,
    })
    const store = useHomeSystemStore()
    store.useApi(mockApi({ getSystem: vi.fn(async () => Promise.reject(failure)) }))

    await store.loadFromGalaxy('/galaxy')

    expect(store.status).toBe('error')
    expect(store.error?.code).toBe('RESOURCE_NOT_FOUND')
    expect(store.objects).toEqual([])
  })

  it('wählt nur bekannte Objekte aus und verwirft unbekannte IDs', async () => {
    const store = useHomeSystemStore()
    store.useApi(mockApi())
    await store.loadFromGalaxy('/galaxy')

    store.select('pln_home')
    expect(store.selectedObjectId).toBe('pln_home')
    expect(store.selectedObject?.kind).toBe('planet')

    store.select('pln_ghost')
    expect(store.selectedObjectId).toBeNull()
    expect(store.selectedObject).toBeNull()
  })
})
