import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './apiError'
import { withSafeRetry } from './retry'

const noSleep = () => Promise.resolve()

function retryableError(): ApiError {
  return new ApiError({
    kind: 'network',
    code: 'NETWORK_ERROR',
    message: 'offline',
    retryable: true,
  })
}

describe('withSafeRetry', () => {
  it('wiederholt eine sichere Abfrage bis zum Erfolg', async () => {
    const op = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(retryableError())
      .mockRejectedValueOnce(retryableError())
      .mockResolvedValueOnce('ok')

    const result = await withSafeRetry(op, { method: 'GET', retries: 2, sleep: noSleep })

    expect(result).toBe('ok')
    expect(op).toHaveBeenCalledTimes(3)
  })

  it('wiederholt einen Befehl niemals und dupliziert ihn dadurch nicht', async () => {
    const op = vi.fn<() => Promise<string>>().mockRejectedValue(retryableError())

    await expect(
      withSafeRetry(op, { method: 'POST', retries: 3, sleep: noSleep }),
    ).rejects.toThrow()

    expect(op).toHaveBeenCalledOnce()
  })

  it('wiederholt einen nicht wiederholbaren Fehler nicht', async () => {
    const unauthorized = new ApiError({
      kind: 'server',
      code: 'AUTHENTICATION_FAILED',
      message: 'nein',
      status: 401,
      retryable: false,
    })
    const op = vi.fn<() => Promise<string>>().mockRejectedValue(unauthorized)

    await expect(withSafeRetry(op, { method: 'GET', sleep: noSleep })).rejects.toBe(unauthorized)

    expect(op).toHaveBeenCalledOnce()
  })

  it('gibt nach Ausschöpfen der Versuche den letzten Fehler weiter', async () => {
    const last = retryableError()
    const op = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(retryableError())
      .mockRejectedValueOnce(last)

    await expect(withSafeRetry(op, { method: 'GET', retries: 1, sleep: noSleep })).rejects.toBe(
      last,
    )

    expect(op).toHaveBeenCalledTimes(2)
  })
})
