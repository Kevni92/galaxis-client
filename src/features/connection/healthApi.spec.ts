import { describe, expect, it, vi } from 'vitest'
import { ApiError, type RestClient } from '@/shared/api'
import { createHealthApi } from './healthApi'

function clientWith(get: RestClient['get']): RestClient {
  return {
    get,
    request: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
  } as unknown as RestClient
}

describe('createHealthApi', () => {
  it('liefert die Livenessantwort des richtigen Pfads', async () => {
    const get = vi.fn(async () => ({ status: 'ok', correlationId: 'cor_live' }))
    const api = createHealthApi(clientWith(get as unknown as RestClient['get']))

    const result = await api.getLiveness()

    expect(get).toHaveBeenCalledWith('/health/live')
    expect(result.status).toBe('ok')
  })

  it('meldet Bereitschaft bei erfolgreicher Antwort', async () => {
    const get = vi.fn(async () => ({ status: 'ready', correlationId: 'cor_ready' }))
    const api = createHealthApi(clientWith(get as unknown as RestClient['get']))

    await expect(api.getReadiness()).resolves.toEqual({
      status: 'ready',
      correlationId: 'cor_ready',
    })
  })

  it('löst den 503-Fall als reguläres not_ready auf', async () => {
    const notReady = new ApiError({
      kind: 'http',
      code: 'HTTP_503',
      message: 'nicht bereit',
      status: 503,
      correlationId: 'cor_nr',
    })
    const get = vi.fn(async () => {
      throw notReady
    })
    const api = createHealthApi(clientWith(get as unknown as RestClient['get']))

    await expect(api.getReadiness()).resolves.toEqual({
      status: 'not_ready',
      correlationId: 'cor_nr',
    })
  })

  it('reicht echte Transportfehler der Readinessprüfung weiter', async () => {
    const network = new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'offline',
      retryable: true,
    })
    const get = vi.fn(async () => {
      throw network
    })
    const api = createHealthApi(clientWith(get as unknown as RestClient['get']))

    await expect(api.getReadiness()).rejects.toBe(network)
  })
})
