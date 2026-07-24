import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/shared/api'
import { useCampaignStateStore } from './campaignStateStore'
import type { CampaignApi, CampaignStateResponse } from './campaignApi'

function stateResponse(overrides: Partial<CampaignStateResponse> = {}): CampaignStateResponse {
  return {
    campaignId: 'cmp_1',
    status: 'running',
    timeProfile: 'standard',
    campaignTimeMs: 0,
    stateVersion: 1,
    generatedAt: '2026-07-23T12:00:00Z',
    balancingVersion: '0.1.0',
    balancingHash: 'sha256:example',
    controlledEmpire: { empireId: 'emp_1', name: 'Startreich', canControl: true },
    links: {
      self: '/api/v1/campaigns/cmp_1/state',
      galaxy: '/api/v1/campaigns/cmp_1/galaxy',
      colonies: '/api/v1/campaigns/cmp_1/empires/emp_1/colonies',
      population: '/api/v1/campaigns/cmp_1/empires/emp_1/population',
      economy: '/api/v1/campaigns/cmp_1/empires/emp_1/economy',
    },
    ...overrides,
  }
}

function mockApi(overrides: Partial<CampaignApi> = {}): CampaignApi {
  return {
    list: vi.fn(async () => ({ campaigns: [] })),
    create: vi.fn(async () => stateResponse() as never),
    getState: vi.fn(async () => ({ state: stateResponse(), etag: 'W/"state-1"' })),
    ...overrides,
  }
}

describe('useCampaignStateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('wirft ohne initialisierte API einen erklärenden Fehler', async () => {
    await expect(useCampaignStateStore().loadState('cmp_1')).rejects.toThrow(/useApi/)
  })

  it('markiert erst nach der Serverantwort als geladen und speichert ETag und Zustandsversion', async () => {
    const api = mockApi()
    const store = useCampaignStateStore()
    store.useApi(api)

    const pending = store.loadState('cmp_1')
    expect(store.status).toBe('loading')
    await pending

    expect(api.getState).toHaveBeenCalledWith('cmp_1')
    expect(store.status).toBe('ready')
    expect(store.etag).toBe('W/"state-1"')
    expect(store.stateVersion).toBe(1)
    expect(store.controlledEmpire?.name).toBe('Startreich')
    expect(store.links.galaxy).toBe('/api/v1/campaigns/cmp_1/galaxy')
  })

  it('übernimmt unbekannte Zusatzfelder unverändert, ohne zu stören', async () => {
    const withExtra = { ...stateResponse(), futureField: 42 } as CampaignStateResponse
    const store = useCampaignStateStore()
    store.useApi(mockApi({ getState: vi.fn(async () => ({ state: withExtra, etag: undefined })) }))

    await store.loadState('cmp_1')

    expect(store.status).toBe('ready')
    expect((store.state as unknown as { futureField: number }).futureField).toBe(42)
    expect(store.stateVersion).toBe(1)
  })

  it('stellt einen fehlenden Zugriff als Fehler ohne Informationsleck dar', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Die angeforderte Ressource wurde nicht gefunden.',
      status: 404,
    })
    const store = useCampaignStateStore()
    store.useApi(mockApi({ getState: vi.fn(async () => Promise.reject(failure)) }))

    await store.loadState('cmp_fremd')

    expect(store.status).toBe('error')
    expect(store.state).toBeNull()
    expect(store.error?.code).toBe('RESOURCE_NOT_FOUND')
    expect(store.error?.message).toBe('Die angeforderte Ressource wurde nicht gefunden.')
  })

  it('verwirft beim Kampagnenwechsel zuerst den alten Zustand', async () => {
    const first = stateResponse({ campaignId: 'cmp_1', stateVersion: 1 })
    const second = stateResponse({ campaignId: 'cmp_2', stateVersion: 5 })
    const getState = vi
      .fn()
      .mockResolvedValueOnce({ state: first, etag: 'W/"1"' })
      .mockImplementationOnce(async () => {
        // Beim Laden der zweiten Kampagne darf der alte Zustand nicht mehr sichtbar sein.
        expect(store.state).toBeNull()
        return { state: second, etag: 'W/"5"' }
      })
    const store = useCampaignStateStore()
    store.useApi(mockApi({ getState }))

    await store.loadState('cmp_1')
    await store.loadState('cmp_2')

    expect(store.state?.campaignId).toBe('cmp_2')
    expect(store.stateVersion).toBe(5)
  })

  it('lädt über reload den zuletzt gewählten Kampagnenzustand erneut', async () => {
    const api = mockApi()
    const store = useCampaignStateStore()
    store.useApi(api)

    await store.loadState('cmp_1')
    await store.reload()

    expect(api.getState).toHaveBeenNthCalledWith(2, 'cmp_1')
  })
})
