import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import ColonyDetailWindow from './ColonyDetailWindow.vue'
import { useColonyStore } from './colonyStore'
import type {
  ColonyApi,
  ColonyOverviewResponse,
  EconomySummaryResponse,
  PopulationSummaryResponse,
} from './colonyApi'

const COLONIES_LINK = '/api/v1/campaigns/cmp_1/empires/emp_1/colonies'

const HOME_PLANET = {
  id: 'pln_home',
  displayNameKey: 'planet.home.name',
  knowledgeLevel: 'explored',
  x: 120.5,
  y: -44,
}

function overview(): ColonyOverviewResponse {
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
        links: {
          system: '/api/v1/x',
          population: '/api/v1/pop',
          economy: '/api/v1/eco',
        },
      },
    ],
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

async function mountWindow(
  planet = HOME_PLANET,
  options: { api?: ColonyApi; selectId?: string } = {},
) {
  const store = useColonyStore()
  store.useApi(options.api ?? mockApi())
  await store.loadColonies(COLONIES_LINK)
  await store.selectPlanet(options.selectId ?? planet.id)
  const wrapper = mount(ColonyDetailWindow, {
    props: { planet },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, store }
}

describe('ColonyDetailWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('zeigt Planetengrunddaten und Kolonieidentität in der Übersicht', async () => {
    const { wrapper } = await mountWindow()

    expect(wrapper.get('[data-testid="modal-title"]').text()).toBe('planet.home.name')
    expect(wrapper.get('[data-testid="planet-name"]').text()).toBe('planet.home.name')
    expect(wrapper.get('[data-testid="planet-category"]').text()).toBe('terrestrial')
    expect(wrapper.get('[data-testid="planet-position"]').text()).toBe('120.5 / -44')
    expect(wrapper.get('[data-testid="colony-id"]').text()).toBe('col_home')
    expect(wrapper.get('[data-testid="colony-home"]').text()).toBe('Ja')
    expect(wrapper.get('[data-testid="colony-lifecycle"]').text()).toBe('etabliert')

    wrapper.unmount()
  })

  it('formatiert die Bevölkerung eindeutig und nennt den Datenstand', async () => {
    const { wrapper } = await mountWindow()

    await wrapper.get('[data-testid="colony-tab-population"]').trigger('click')

    expect(wrapper.get('[data-testid="colony-tab-population"]').attributes('aria-selected')).toBe(
      'true',
    )
    expect(wrapper.get('[data-testid="population-total"]').text()).toBe('1.000.000')
    expect(wrapper.get('[data-testid="population-nonworkforce"]').text()).toBe('400.000')
    expect(wrapper.get('[data-testid="population-datastate"]').text()).toContain(
      '23.07.2026, 12:00 UTC',
    )

    wrapper.unmount()
  })

  it('kennzeichnet die Grundversorgungsreichweite als Prognose mit Datenstand', async () => {
    const { wrapper } = await mountWindow()

    await wrapper.get('[data-testid="colony-tab-supply"]').trigger('click')

    expect(wrapper.get('[data-testid="supply-quantity"]').text()).toBe('30.000')
    expect(wrapper.get('[data-testid="supply-coverage"]').text()).toBe('30 Tage')
    expect(wrapper.get('[data-testid="supply-datastate"]').text()).toContain('Prognose-Datenstand')

    wrapper.unmount()
  })

  it('bietet keine editierbaren Steuerelemente ohne Serverbefehl', async () => {
    const { wrapper } = await mountWindow()

    // Nur Navigations- und Schließschaltflächen, keine Formulare oder Eingaben.
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(false)

    wrapper.unmount()
  })

  it('meldet den Schließwunsch über die Aktions- und Titelleiste', async () => {
    const { wrapper } = await mountWindow()

    await wrapper.get('[data-testid="colony-close-action"]').trigger('click')
    await wrapper.get('[data-testid="modal-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(2)
    wrapper.unmount()
  })

  it('zeigt für einen bekannten Planeten ohne Kolonie einen klaren leeren Zustand', async () => {
    const otherPlanet = { ...HOME_PLANET, id: 'pln_other', displayNameKey: 'planet.other.name' }
    const { wrapper } = await mountWindow(otherPlanet)

    expect(wrapper.find('[data-testid="colony-none"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="colony-tab-population"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="colony-tab-supply"]').exists()).toBe(false)
    // Planetengrunddaten ohne Koloniewissen bleiben klar gekennzeichnet.
    expect(wrapper.get('[data-testid="planet-category"]').text()).toBe('unbekannt')

    wrapper.unmount()
  })
})
