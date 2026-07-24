import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@/shared/api'
import ConnectionBanner from './ConnectionBanner.vue'
import { useConnectionStore } from './connectionStore'
import type { HealthApi } from './healthApi'

const noSleep = () => Promise.resolve()

function mockApi(overrides: Partial<HealthApi> = {}): HealthApi {
  return {
    getLiveness: vi.fn(async () => ({ status: 'ok' as const, correlationId: 'cor_live' })),
    getReadiness: vi.fn(async () => ({ status: 'ready' as const, correlationId: 'cor_ready' })),
    ...overrides,
  }
}

function offlineApi(): HealthApi {
  return mockApi({
    getLiveness: vi.fn(async () => {
      throw new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Die Verbindung zum Server ist fehlgeschlagen.',
        correlationId: 'cor_net',
        retryable: false,
      })
    }),
  })
}

describe('ConnectionBanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('bleibt bei bestätigter Verbindung unsichtbar', async () => {
    const store = useConnectionStore()
    store.useApi(mockApi(), { sleep: noSleep })
    await store.check()

    const wrapper = mount(ConnectionBanner)

    expect(wrapper.find('[data-testid="connection-banner"]').exists()).toBe(false)
  })

  it('zeigt bei Serverausfall Meldung, Korrelations-ID und Wiederholung', async () => {
    const store = useConnectionStore()
    store.useApi(offlineApi(), { sleep: noSleep })
    await store.check()

    const wrapper = mount(ConnectionBanner)

    expect(wrapper.get('[data-testid="connection-banner"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="error-title"]').text()).toBe('Server nicht erreichbar')
    expect(wrapper.get('[data-testid="correlation-id"]').text()).toBe('cor_net')
    expect(wrapper.find('[data-testid="retry-button"]').exists()).toBe(true)
  })

  it('prüft bei Wiederholung erneut und verschwindet nach erfolgreicher Verbindung', async () => {
    const store = useConnectionStore()
    const getLiveness = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError({
          kind: 'network',
          code: 'NETWORK_ERROR',
          message: 'offline',
          correlationId: 'cor_net',
          retryable: false,
        }),
      )
      .mockResolvedValueOnce({ status: 'ok', correlationId: 'cor_live' })
    store.useApi(mockApi({ getLiveness }), { sleep: noSleep })
    await store.check()

    const wrapper = mount(ConnectionBanner)
    expect(wrapper.find('[data-testid="connection-banner"]').exists()).toBe(true)

    await wrapper.get('[data-testid="retry-button"]').trigger('click')
    await flushPromises()

    expect(getLiveness).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="connection-banner"]').exists()).toBe(false)
  })
})
