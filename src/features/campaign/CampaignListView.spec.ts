import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import CampaignListView from './CampaignListView.vue'
import { useCampaignStore } from './campaignStore'
import { ApiError } from '@/shared/api'
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

const Stub = defineComponent({ template: '<div />' })

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns', name: 'campaigns', component: CampaignListView },
      { path: '/campaigns/:campaignId', name: 'campaign', component: Stub },
    ],
  })
}

function mockApi(overrides: Partial<CampaignApi> = {}): CampaignApi {
  return {
    list: vi.fn(async () => ({ campaigns: [] })),
    create: vi.fn(async () => campaign()),
    ...overrides,
  }
}

async function mountView(api: CampaignApi) {
  const router = buildRouter()
  useCampaignStore().useApi(api)
  router.push('/campaigns')
  await router.isReady()
  const wrapper = mount(CampaignListView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('CampaignListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('zeigt die Kampagnen mit Status und Zeitprofil unverändert vom Server', async () => {
    const api = mockApi({
      list: vi.fn(async () => ({
        campaigns: [campaign({ status: 'running', timeProfile: 'schnell' })],
      })),
    })
    const { wrapper } = await mountView(api)

    expect(wrapper.get('[data-testid="campaign-status"]').text()).toBe('running')
    expect(wrapper.get('[data-testid="campaign-time-profile"]').text()).toBe('schnell')
  })

  it('zeigt einen Leerzustand, wenn keine Kampagne existiert', async () => {
    const { wrapper } = await mountView(mockApi())

    expect(wrapper.find('[data-testid="list-empty"]').exists()).toBe(true)
  })

  it('erstellt eine Kampagne mit Idempotenzschlüssel und leitet zur Übersicht weiter', async () => {
    const created = campaign({ campaignId: 'cmp_new' })
    const api = mockApi({ create: vi.fn(async () => created) })
    const { wrapper, router } = await mountView(api)

    await wrapper.get('[data-testid="seed-input"]').setValue(42)
    await wrapper.get('[data-testid="time-profile-input"]').setValue('standard')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.create).toHaveBeenCalledTimes(1)
    const [request, key] = (api.create as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(request).toEqual({ seed: 42, timeProfile: 'standard' })
    expect(typeof key).toBe('string')
    expect((key as string).length).toBeGreaterThan(0)
    expect(router.currentRoute.value.name).toBe('campaign')
    expect(router.currentRoute.value.params.campaignId).toBe('cmp_new')
  })

  it('sendet trotz mehrfachen Absendens nur einen Erstell-Request', async () => {
    let resolveCreate: (value: CampaignResponse) => void = () => {}
    const api = mockApi({
      create: vi.fn(() => new Promise<CampaignResponse>((resolve) => (resolveCreate = resolve))),
    })
    const { wrapper } = await mountView(api)

    await wrapper.get('[data-testid="seed-input"]').setValue(42)
    await wrapper.get('[data-testid="time-profile-input"]').setValue('standard')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')

    expect(api.create).toHaveBeenCalledTimes(1)
    resolveCreate(campaign())
    await flushPromises()
  })

  it('stellt Feld- und Allgemeinfehler des Servers dar und bleibt auf der Liste', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'INVALID_CAMPAIGN',
      message: 'Die Kampagne konnte nicht angelegt werden.',
      status: 400,
      details: [{ field: 'timeProfile', reason: 'INVALID_TIME_PROFILE' }],
    })
    const api = mockApi({ create: vi.fn(async () => Promise.reject(failure)) })
    const { wrapper, router } = await mountView(api)

    await wrapper.get('[data-testid="seed-input"]').setValue(42)
    await wrapper.get('[data-testid="time-profile-input"]').setValue('unbekannt')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="create-error"]').text()).toBe(
      'Die Kampagne konnte nicht angelegt werden.',
    )
    expect(wrapper.get('[data-testid="time-profile-input"]').attributes('aria-invalid')).toBe(
      'true',
    )
    expect(router.currentRoute.value.name).toBe('campaigns')
  })

  it('verwendet bei einer Wiederholung mit gleichen Daten denselben Idempotenzschlüssel', async () => {
    const failure = new ApiError({ kind: 'server', code: 'INTERNAL_ERROR', message: 'Fehler.' })
    const api = mockApi({ create: vi.fn(async () => Promise.reject(failure)) })
    const { wrapper } = await mountView(api)

    await wrapper.get('[data-testid="seed-input"]').setValue(42)
    await wrapper.get('[data-testid="time-profile-input"]').setValue('standard')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const calls = (api.create as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][1]).toBe(calls[1][1])
  })

  it('erzeugt bei geänderten Daten einen neuen Idempotenzschlüssel', async () => {
    const failure = new ApiError({ kind: 'server', code: 'INTERNAL_ERROR', message: 'Fehler.' })
    const api = mockApi({ create: vi.fn(async () => Promise.reject(failure)) })
    const { wrapper } = await mountView(api)

    await wrapper.get('[data-testid="seed-input"]').setValue(42)
    await wrapper.get('[data-testid="time-profile-input"]').setValue('standard')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('[data-testid="time-profile-input"]').setValue('schnell')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const calls = (api.create as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][1]).not.toBe(calls[1][1])
  })
})
