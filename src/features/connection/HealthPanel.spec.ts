import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@/shared/api'
import HealthPanel from './HealthPanel.vue'
import { HEALTH_API_KEY } from './healthInjection'
import type { HealthApi } from './healthApi'

function mockApi(overrides: Partial<HealthApi> = {}): HealthApi {
  return {
    getLiveness: vi.fn(async () => ({ status: 'ok' as const, correlationId: 'cor_live' })),
    getReadiness: vi.fn(async () => ({ status: 'ready' as const, correlationId: 'cor_ready' })),
    ...overrides,
  }
}

function mountWith(api: HealthApi) {
  return mount(HealthPanel, { global: { provide: { [HEALTH_API_KEY as symbol]: api } } })
}

describe('HealthPanel', () => {
  it('zeigt erreichbar und bereit bei gesundem Server', async () => {
    const wrapper = mountWith(mockApi())
    await flushPromises()

    expect(wrapper.get('[data-testid="health-live-status"]').text()).toBe('erreichbar')
    expect(wrapper.get('[data-testid="health-ready-status"]').text()).toBe('bereit')
  })

  it('unterscheidet „nicht bereit" von „nicht erreichbar"', async () => {
    const wrapper = mountWith(
      mockApi({
        getReadiness: vi.fn(async () => ({
          status: 'not_ready' as const,
          correlationId: 'cor_nr',
        })),
      }),
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="health-live-status"]').text()).toBe('erreichbar')
    expect(wrapper.get('[data-testid="health-ready-status"]').text()).toBe('nicht bereit')
  })

  it('zeigt nicht erreichbar, wenn die Livenessprüfung fehlschlägt', async () => {
    const wrapper = mountWith(
      mockApi({
        getLiveness: vi.fn(async () => {
          throw new ApiError({
            kind: 'network',
            code: 'NETWORK_ERROR',
            message: 'offline',
            retryable: true,
          })
        }),
        getReadiness: vi.fn(async () => {
          throw new ApiError({
            kind: 'network',
            code: 'NETWORK_ERROR',
            message: 'offline',
            retryable: true,
          })
        }),
      }),
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="health-live-status"]').text()).toBe('nicht erreichbar')
    expect(wrapper.get('[data-testid="health-ready-status"]').text()).toBe('nicht erreichbar')
  })

  it('prüft auf Knopfdruck erneut', async () => {
    const api = mockApi()
    const wrapper = mountWith(api)
    await flushPromises()

    await wrapper.get('[data-testid="health-refresh"]').trigger('click')
    await flushPromises()

    expect(api.getLiveness).toHaveBeenCalledTimes(2)
  })
})
