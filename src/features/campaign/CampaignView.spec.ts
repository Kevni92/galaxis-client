import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import CampaignView from './CampaignView.vue'
import { useCampaignStateStore } from './campaignStateStore'
import { ApiError } from '@/shared/api'
import type { CampaignApi, CampaignStateResponse } from './campaignApi'
import { useHomeSystemStore } from '@/features/galaxy'
import type { GalaxyApi, GalaxyOverviewResponse, SystemDetailResponse } from '@/features/galaxy'
import { useColonyStore } from '@/features/colony'
import type { ColonyApi, ColonyOverviewResponse } from '@/features/colony'

const SYSTEM_LINK = '/api/v1/campaigns/cmp_1/systems/sys_home'

function galaxy(): GalaxyOverviewResponse {
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
  }
}

function system(): SystemDetailResponse {
  return {
    campaignId: 'cmp_1',
    stateVersion: 1,
    generatedAt: '2026-07-23T12:00:00Z',
    systemId: 'sys_home',
    regionId: 'reg_core',
    knowledgeLevel: 'explored',
    displayNameKey: 'system.home.name',
    stars: [],
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
  }
}

function galaxyApi(): GalaxyApi {
  return { getGalaxy: vi.fn(async () => galaxy()), getSystem: vi.fn(async () => system()) }
}

function colonyOverview(): ColonyOverviewResponse {
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
        links: { system: SYSTEM_LINK, population: '/api/v1/pop', economy: '/api/v1/eco' },
      },
    ],
  }
}

function colonyApi(): ColonyApi {
  return {
    getColonies: vi.fn(async () => colonyOverview()),
    getPopulation: vi.fn(async () => Promise.reject(new Error('nicht benötigt'))),
    getEconomy: vi.fn(async () => Promise.reject(new Error('nicht benötigt'))),
  }
}

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
      {
        path: '/campaigns/:campaignId/systems/:systemId',
        name: 'campaign-system',
        component: CampaignView,
      },
    ],
  })
}

async function mountAt(campaignId: string, api: CampaignApi) {
  const router = buildRouter()
  useCampaignStateStore().useApi(api)
  // Kolonie- und Galaxie-Store verdrahten; die 3D-Ansicht wird gestubbt, ihre Auswahl treibt der Test.
  useColonyStore().useApi(colonyApi())
  useHomeSystemStore().useApi(galaxyApi())
  router.push(`/campaigns/${campaignId}`)
  await router.isReady()
  const wrapper = mount(CampaignView, {
    // Die eingebettete 3D-Systemansicht wird gestubbt; sie hat eigene Tests und lädt sonst Three.js.
    global: { plugins: [router], stubs: { HomeSystemView: true } },
  })
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
    // Die bekannte 3D-Heimatsystemansicht ist als Arbeitsfläche eingebettet (per Linkrelation).
    expect(wrapper.find('[data-testid="campaign-home-system"]').exists()).toBe(true)
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

  it('öffnet das modale Koloniedetail bei Planetenauswahl und schließt es wieder', async () => {
    const { wrapper, router } = await mountAt('cmp_1', mockApi())

    // Ohne Auswahl bleibt die Szene als Arbeitsfläche allein sichtbar.
    expect(wrapper.find('[data-testid="campaign-colony-detail"]').exists()).toBe(false)

    // Auswahl des Heimatplaneten (gleichwertig zu Szene-Picking, Liste oder URL) öffnet das Fenster.
    const homeSystem = useHomeSystemStore()
    await homeSystem.loadFromGalaxy('/api/v1/campaigns/cmp_1/galaxy')
    homeSystem.select('pln_home')
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-colony-detail"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="modal-title"]').text()).toBe('planet.home.name')

    // Schließen entfernt den Fensterzustand, die Auswahl bleibt als räumlicher Kontext erhalten.
    await wrapper.get('[data-testid="colony-close-action"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-colony-detail"]').exists()).toBe(false)
    expect(homeSystem.selectedObjectId).toBe('pln_home')
    expect(router.currentRoute.value.query.window).toBeUndefined()
  })

  it('stellt Fenster und aktiven Tab aus einem Deep Link wieder her', async () => {
    const { wrapper, router } = await mountAt('cmp_1', mockApi())
    await router.replace({
      query: { object: 'pln_home', window: 'colony', tab: 'population' },
    })

    const homeSystem = useHomeSystemStore()
    await homeSystem.loadFromGalaxy('/api/v1/campaigns/cmp_1/galaxy')
    homeSystem.select('pln_home')
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-colony-detail"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="colony-tab-population"]').attributes('aria-selected')).toBe(
      'true',
    )
    expect(router.currentRoute.value.query).toEqual({
      object: 'pln_home',
      window: 'colony',
      tab: 'population',
    })
  })

  it('normalisiert einen unbekannten Detail-Tab ohne Fensterwechsel', async () => {
    const { wrapper, router } = await mountAt('cmp_1', mockApi())
    await router.replace({
      query: { object: 'pln_home', window: 'colony', tab: 'unknown' },
    })

    const homeSystem = useHomeSystemStore()
    await homeSystem.loadFromGalaxy('/api/v1/campaigns/cmp_1/galaxy')
    homeSystem.select('pln_home')
    await flushPromises()

    expect(wrapper.get('[data-testid="colony-tab-overview"]').attributes('aria-selected')).toBe(
      'true',
    )
    expect(router.currentRoute.value.query.tab).toBe('overview')
  })

  it('entspricht dem erwarteten Mock-Snapshot des geladenen Zustands', async () => {
    const { wrapper } = await mountAt('cmp_1', mockApi())

    expect(wrapper.get('[data-testid="campaign-nav"]').html()).toMatchSnapshot()
  })
})
