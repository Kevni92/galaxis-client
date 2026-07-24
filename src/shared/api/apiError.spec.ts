import { describe, expect, it } from 'vitest'
import { ApiError, apiErrorFromResponse, isApiError } from './apiError'
import type { ServerErrorResponse } from './contract'

describe('apiErrorFromResponse', () => {
  it('übernimmt Felder aus dem Vertrags-Fehlerkörper', () => {
    const body: ServerErrorResponse = {
      error: {
        code: 'SESSION_INVALID',
        message: 'Es fehlt eine gültige Bearer-Session.',
        correlationId: 'cor_1',
        retryable: false,
      },
    }
    const error = apiErrorFromResponse(401, body, 'cor_fallback')

    expect(error.kind).toBe('server')
    expect(error.code).toBe('SESSION_INVALID')
    expect(error.correlationId).toBe('cor_1')
    expect(error.message).toBe('Es fehlt eine gültige Bearer-Session.')
  })

  it('nutzt die Client-Korrelation, wenn der Körper kein Vertragsfehler ist', () => {
    const error = apiErrorFromResponse(404, '<html>not found</html>', 'cor_fallback')

    expect(error.kind).toBe('http')
    expect(error.code).toBe('HTTP_404')
    expect(error.correlationId).toBe('cor_fallback')
  })
})

describe('ApiError.toUiError', () => {
  it('liefert eine serialisierbare UI-Sicht ohne Stacktrace', () => {
    const error = new ApiError({ kind: 'server', code: 'CONFLICT', message: 'x', status: 409 })
    const ui = error.toUiError()

    expect(isApiError(error)).toBe(true)
    expect(ui).toMatchObject({
      kind: 'server',
      code: 'CONFLICT',
      message: 'x',
      status: 409,
      retryable: false,
      details: [],
    })
    expect('stack' in ui).toBe(false)
  })
})
