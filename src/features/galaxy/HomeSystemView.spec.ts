import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import HomeSystemView from './HomeSystemView.vue'
import { useHomeSystemStore } from './homeSystemStore'
import { ApiError } from '@/shared/api'
import type { GalaxyApi, GalaxyOverviewResponse, SystemDetailResponse } from './galaxyApi'
import type { SceneObject, SystemScene, SystemSceneFactory } from './rendering/systemScene'

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

function system(): SystemDetailResponse {
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
  }
}

function mockApi(overrides: Partial<GalaxyApi> = {}): GalaxyApi {
  return {
    getGalaxy: vi.fn(async () => galaxy()),
    getSystem: vi.fn(async () => system()),
    ...overrides,
  }
}

/** Fake-Szene: erfasst Aufrufe und erlaubt das Simulieren einer Auswahl per Zeiger (Picking). */
function fakeScene() {
  let selectHandler: ((id: string) => void) | null = null
  const calls = {
    objects: [] as readonly SceneObject[],
    selection: undefined as string | null | undefined,
    disposed: false,
  }
  const scene: SystemScene = {
    setObjects: (objects) => (calls.objects = objects),
    setSelection: (id) => (calls.selection = id),
    onSelect: (handler) => (selectHandler = handler),
    resize: () => {},
    dispose: () => (calls.disposed = true),
  }
  const factory: SystemSceneFactory = () => scene
  return { factory, calls, pick: (id: string) => selectHandler?.(id) }
}

const Stub = defineComponent({ template: '<div />' })

function buildRouter(query: Record<string, string> = {}): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/campaigns/:campaignId', name: 'campaign', component: Stub }],
  })
  router.push({ path: '/campaigns/cmp_1', query })
  return router
}

async function mountView(
  options: { api?: GalaxyApi; query?: Record<string, string>; systemId?: string } = {},
) {
  const scene = fakeScene()
  const router = buildRouter(options.query)
  useHomeSystemStore().useApi(options.api ?? mockApi())
  await router.isReady()
  const wrapper = mount(HomeSystemView, {
    props: {
      galaxyLink: '/api/v1/campaigns/cmp_1/galaxy',
      systemId: options.systemId,
      sceneFactory: scene.factory,
    },
    global: { plugins: [router] },
  })
  await flushPromises()
  return { wrapper, router, scene }
}

describe('HomeSystemView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lädt das Heimatsystem und listet nur bekannte Objekte tastaturbedienbar', async () => {
    const { wrapper, scene } = await mountView()

    const options = wrapper.findAll('[data-testid="home-system-objects"] [role="option"]')
    expect(options).toHaveLength(2)
    expect(wrapper.get('[data-testid="object-str_home"]').text()).toContain('star.home.name')
    expect(wrapper.get('[data-testid="object-pln_home"]').text()).toContain('planet.home.name')
    // Die Szene erhält dieselben Objekte über die gekapselte Rendering-Schicht.
    expect(scene.calls.objects).toHaveLength(2)
  })

  it('wählt über die Objektliste aus und spiegelt die Auswahl in URL und Szene', async () => {
    const { wrapper, router, scene } = await mountView()

    await wrapper.get('[data-testid="object-pln_home"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="object-pln_home"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="selection-name"]').text()).toBe('planet.home.name')
    expect(router.currentRoute.value.query.object).toBe('pln_home')
    expect(scene.calls.selection).toBe('pln_home')
  })

  it('übernimmt die Auswahl per Picking aus der Szene', async () => {
    const { wrapper, scene } = await mountView()

    scene.pick('str_home')
    await flushPromises()

    expect(wrapper.get('[data-testid="object-str_home"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="selection-kind"]').text()).toBe('star')
  })

  it('stellt die Auswahl aus der URL nach dem Laden wieder her', async () => {
    const { wrapper } = await mountView({ query: { object: 'pln_home' } })

    expect(wrapper.find('[data-testid="home-system-selection"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="selection-name"]').text()).toBe('planet.home.name')
  })

  it('ignoriert eine unbekannte Objekt-ID aus der URL ohne Auswahl oder Leck', async () => {
    const { wrapper } = await mountView({ query: { object: 'pln_ghost' } })

    expect(wrapper.find('[data-testid="home-system-selection"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="object-pln_ghost"]').exists()).toBe(false)
  })

  it('zeigt bei einem Ladefehler eine Fehlermeldung statt der Objektliste', async () => {
    const failure = new ApiError({
      kind: 'server',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Die angeforderte Ressource wurde nicht gefunden.',
      status: 404,
    })
    const { wrapper } = await mountView({
      api: mockApi({ getSystem: vi.fn(async () => Promise.reject(failure)) }),
    })

    expect(wrapper.get('[data-testid="home-system-error"]').text()).toContain(
      'Die angeforderte Ressource wurde nicht gefunden.',
    )
    expect(wrapper.find('[data-testid="home-system-objects"]').exists()).toBe(false)
  })

  it('zeigt für ein nicht sichtbares Deep-Link-System einen sicheren Leerzustand', async () => {
    const { wrapper } = await mountView({ systemId: 'sys_unknown' })

    expect(wrapper.get('[data-testid="home-system-empty"]').text()).toContain('nicht sichtbar')
    expect(wrapper.find('[data-testid="home-system-objects"]').exists()).toBe(false)
  })

  it('kennzeichnet ein bekanntes System ohne sichtbare Objekte als leer', async () => {
    const emptySystem = { ...system(), stars: [], planets: [] }
    const { wrapper } = await mountView({
      api: mockApi({ getSystem: vi.fn(async () => emptySystem) }),
    })

    expect(wrapper.find('[data-testid="home-system-no-objects"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-system-objects"]').exists()).toBe(false)
  })
})
