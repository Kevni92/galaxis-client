import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/shared/api'
import { useCampaignStore } from './campaignStore'
import type { CampaignApi, CampaignResponse } from './campaignApi'

function campaign(overrides: Partial<CampaignResponse> = {}): CampaignResponse {
  return {
    campaignId: 'cmp_1',
    type: 'singleplayer',
    status: 'running',
    seed: 1337,
    timeProfile: 'standard',
    balancingVersion: '0.1.0',
    catalogVersion: '0.1.0',
    balancingHash: 'sha256:example',
    stateVersion: 1,
    createdAt: '2026-07-23T12:00:00Z',
    ...overrides,
  }
}

function mockApi(overrides: Partial<CampaignApi> = {}): CampaignApi {
  return {
    list: vi.fn(async () => ({ campaigns: [] })),
    create: vi.fn(async () => campaign()),
    ...overrides,
  }
}

describe('useCampaignStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('wirft ohne initialisierte API einen erklärenden Fehler', async () => {
    await expect(useCampaignStore().load()).rejects.toThrow(/useApi/)
  })

  it('lädt die Kampagnen und markiert erst nach Serverantwort als bereit', async () => {
    const api = mockApi({ list: vi.fn(async () => ({ campaigns: [campaign()] })) })
    const store = useCampaignStore()
    store.useApi(api)

    const pending = store.load()
    expect(store.listStatus).toBe('loading')
    await pending

    expect(store.listStatus).toBe('ready')
    expect(store.campaigns).toEqual([campaign()])
  })

  it('behält Serverwerte unverändert und erfindet keine Defaults', async () => {
    const fromServer = campaign({ status: 'running', timeProfile: 'schnell', stateVersion: 7 })
    const store = useCampaignStore()
    store.useApi(mockApi({ list: vi.fn(async () => ({ campaigns: [fromServer] })) }))

    await store.load()

    expect(store.campaigns[0]).toEqual(fromServer)
  })

  it('speichert bei einem Ladefehler eine UI-Fehlerdarstellung', async () => {
    const api = mockApi({
      list: vi.fn(async () => {
        throw new ApiError({ kind: 'server', code: 'INTERNAL_ERROR', message: 'Serverfehler.' })
      }),
    })
    const store = useCampaignStore()
    store.useApi(api)

    await store.load()

    expect(store.listStatus).toBe('error')
    expect(store.listError?.message).toBe('Serverfehler.')
  })

  it('erstellt eine Kampagne, gibt sie zurück und stellt sie an den Listenanfang', async () => {
    const created = campaign({ campaignId: 'cmp_new' })
    const api = mockApi({ create: vi.fn(async () => created) })
    const store = useCampaignStore()
    store.useApi(api)
    store.campaigns = [campaign({ campaignId: 'cmp_old' })]

    const result = await store.create({ seed: 1, timeProfile: 'standard' }, 'idk_1')

    expect(api.create).toHaveBeenCalledWith({ seed: 1, timeProfile: 'standard' }, 'idk_1')
    expect(result).toEqual(created)
    expect(store.campaigns.map((c) => c.campaignId)).toEqual(['cmp_new', 'cmp_old'])
  })

  it('erzeugt bei idempotenter Wiederholung keinen Duplikateintrag', async () => {
    const created = campaign({ campaignId: 'cmp_new', stateVersion: 2 })
    const store = useCampaignStore()
    store.useApi(mockApi({ create: vi.fn(async () => created) }))
    store.campaigns = [campaign({ campaignId: 'cmp_new', stateVersion: 1 })]

    await store.create({ seed: 1, timeProfile: 'standard' }, 'idk_1')

    expect(store.campaigns).toHaveLength(1)
    expect(store.campaigns[0]).toEqual(created)
  })

  it('meldet einen Erstellfehler im Store und reicht ihn zum Formular weiter', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'INVALID_CAMPAIGN',
      message: 'Ungültig.',
      status: 400,
    })
    const store = useCampaignStore()
    store.useApi(mockApi({ create: vi.fn(async () => Promise.reject(failure)) }))

    await expect(store.create({ seed: 1, timeProfile: 'x' }, 'idk_1')).rejects.toBe(failure)
    expect(store.createPending).toBe(false)
    expect(store.createError?.code).toBe('INVALID_CAMPAIGN')
  })
})
