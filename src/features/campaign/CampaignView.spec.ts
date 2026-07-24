import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import CampaignView from './CampaignView.vue'
import { useCampaignStateStore } from './campaignStateStore'
import { ApiError } from '@/shared/api'
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

const Stub = defineComponent({ template: '<div />' })

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns', name: 'campaigns', component: Stub },
      { path: '/campaigns/:campaignId', name: 'campaign', component: CampaignView },
    ],
  })
}

async function mountAt(campaignId: string, api: CampaignApi) {
  const router = buildRouter()
  useCampaignStateStore().useApi(api)
  router.push(`/campaigns/${campaignId}`)
  await router.isReady()
  const wrapper = mount(CampaignView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('CampaignView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lädt den Kampagnenzustand und zeigt Grunddaten und Navigation', async () => {
    const { wrapper } = await mountAt('cmp_1', mockApi())

    expect(wrapper.get('[data-testid="campaign-view-id"]').text()).toContain('cmp_1')
    expect(wrapper.get('[data-testid="campaign-view-status"]').text()).toBe('running')
    expect(wrapper.get('[data-testid="campaign-view-state-version"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="campaign-view-empire"]').text()).toBe('Startreich')
    expect(wrapper.find('[data-testid="nav-galaxy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-colonies"]').exists()).toBe(true)
  })

  it('stellt einen fehlenden Zugriff als Fehler dar, ohne Grunddaten zu zeigen', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Die angeforderte Ressource wurde nicht gefunden.',
      status: 404,
    })
    const { wrapper } = await mountAt(
      'cmp_fremd',
      mockApi({ getState: vi.fn(async () => Promise.reject(failure)) }),
    )

    expect(wrapper.get('[data-testid="campaign-error"]').text()).toContain(
      'Die angeforderte Ressource wurde nicht gefunden.',
    )
    expect(wrapper.find('[data-testid="campaign-view-status"]').exists()).toBe(false)
  })

  it('entspricht dem erwarteten Mock-Snapshot des geladenen Zustands', async () => {
    const { wrapper } = await mountAt('cmp_1', mockApi())

    expect(wrapper.get('[data-testid="campaign-nav"]').html()).toMatchSnapshot()
  })
})
