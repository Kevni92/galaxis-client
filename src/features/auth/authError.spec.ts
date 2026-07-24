import { describe, expect, it } from 'vitest'
import { ApiError, networkError } from '@/shared/api'
import { extractAuthError } from './authError'

describe('extractAuthError', () => {
  it('übernimmt die generische Servermeldung ohne Feldfehler', () => {
    const error = new ApiError({
      kind: 'server',
      code: 'AUTHENTICATION_FAILED',
      message: 'Anmeldung fehlgeschlagen.',
      status: 401,
    })

    expect(extractAuthError(error)).toEqual({
      message: 'Anmeldung fehlgeschlagen.',
      fieldErrors: {},
    })
  })

  it('bildet Feld-Details auf verständliche Feldmeldungen ab', () => {
    const error = new ApiError({
      kind: 'server',
      code: 'INVALID_REQUEST',
      message: 'Eingabe ist ungültig.',
      status: 400,
      details: [
        { field: 'email', reason: 'INVALID_FORMAT' },
        { field: 'password', reason: 'TOO_SHORT' },
      ],
    })

    const result = extractAuthError(error)

    expect(result.message).toBe('Eingabe ist ungültig.')
    expect(result.fieldErrors.email).toBe('Ungültiges Format.')
    expect(result.fieldErrors.password).toBe('Zu kurz.')
  })

  it('behält je Feld die erste Meldung und übersetzt unbekannte Gründe neutral', () => {
    const error = new ApiError({
      kind: 'server',
      code: 'INVALID_REQUEST',
      message: 'Eingabe ist ungültig.',
      status: 400,
      details: [
        { field: 'email', reason: 'INVALID_FORMAT' },
        { field: 'email', reason: 'SOMETHING_ELSE' },
      ],
    })

    const result = extractAuthError(error)

    expect(result.fieldErrors.email).toBe('Ungültiges Format.')
  })

  it('liefert eine neutrale Meldung für Nicht-Server-Fehler', () => {
    const result = extractAuthError(networkError('cor_1', new Error('offline')))

    expect(result.fieldErrors).toEqual({})
    expect(result.message).not.toContain('offline')
    expect(result.message.length).toBeGreaterThan(0)
  })
})
