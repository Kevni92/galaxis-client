import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/shared/api'
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

function networkError(retryable = true): ApiError {
  return new ApiError({
    kind: 'network',
    code: 'NETWORK_ERROR',
    message: 'offline',
    correlationId: 'cor_net',
    retryable,
  })
}

describe('connectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('beginnt im Zustand unknown', () => {
    const store = useConnectionStore()
    expect(store.status).toBe('unknown')
    expect(store.lastError).toBeNull()
  })

  it('wird bei erreichbarem Server online', async () => {
    const store = useConnectionStore()
    store.useApi(mockApi(), { sleep: noSleep })

    await store.check()

    expect(store.status).toBe('online')
    expect(store.isOnline).toBe(true)
    expect(store.lastError).toBeNull()
  })

  it('wird bei Netzwerkfehler offline und merkt sich den Fehler', async () => {
    const store = useConnectionStore()
    store.useApi(
      mockApi({
        getLiveness: vi.fn(async () => {
          throw networkError(false)
        }),
      }),
      { sleep: noSleep },
    )

    await store.check()

    expect(store.status).toBe('offline')
    expect(store.isOffline).toBe(true)
    expect(store.lastError?.correlationId).toBe('cor_net')
  })

  it('wird bei unerwartetem Serverfehler zu error statt offline', async () => {
    const store = useConnectionStore()
    store.useApi(
      mockApi({
        getLiveness: vi.fn(async () => {
          throw new ApiError({ kind: 'http', code: 'HTTP_500', message: 'kaputt', status: 500 })
        }),
      }),
      { sleep: noSleep },
    )

    await store.check()

    expect(store.status).toBe('error')
  })

  it('wiederholt die sichere Livenessabfrage bei einem kurzen Aussetzer', async () => {
    const store = useConnectionStore()
    const getLiveness = vi
      .fn()
      .mockRejectedValueOnce(networkError(true))
      .mockResolvedValueOnce({ status: 'ok', correlationId: 'cor_live' })
    store.useApi(mockApi({ getLiveness }), { sleep: noSleep })

    await store.check()

    expect(getLiveness).toHaveBeenCalledTimes(2)
    expect(store.status).toBe('online')
  })

  it('teilt gleichzeitige Prüfungen als eine einzige Abfrage', async () => {
    const store = useConnectionStore()
    const getLiveness = vi.fn(async () => ({ status: 'ok' as const, correlationId: 'cor_live' }))
    store.useApi(mockApi({ getLiveness }), { sleep: noSleep })

    await Promise.all([store.check(), store.check()])

    expect(getLiveness).toHaveBeenCalledOnce()
  })

  it('erlaubt eine erneute manuelle Prüfung nach einem Fehler', async () => {
    const store = useConnectionStore()
    const getLiveness = vi
      .fn()
      .mockRejectedValueOnce(networkError(false))
      .mockResolvedValueOnce({ status: 'ok', correlationId: 'cor_live' })
    store.useApi(mockApi({ getLiveness }), { sleep: noSleep })

    await store.check()
    expect(store.status).toBe('offline')

    await store.check()
    expect(store.status).toBe('online')
    expect(store.lastError).toBeNull()
  })
})
