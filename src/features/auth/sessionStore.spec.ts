import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError, networkError } from '@/shared/api'
import { useSessionStore } from './sessionStore'
import { SESSION_TOKEN_KEY } from './tokenStorage'
import type { SessionApi, SessionCreatedResponse, SessionResponse } from './sessionApi'

const sessionResponse: SessionResponse = {
  sessionId: 'ses_1',
  accountId: 'acc_1',
  email: 'captain@example.test',
  createdAt: '2026-07-24T12:00:00Z',
  expiresAt: '2026-07-25T12:00:00Z',
}

const sessionCreated: SessionCreatedResponse = {
  ...sessionResponse,
  token: 'tok_new',
}

function sessionInvalidError(): ApiError {
  return new ApiError({
    kind: 'server',
    code: 'SESSION_INVALID',
    message: 'Es fehlt eine gültige Bearer-Session.',
    status: 401,
  })
}

/** Legt ein persistiertes Token an, bevor der Store es beim Anlegen einliest. */
function seedPersistedToken(token: string): void {
  globalThis.sessionStorage.setItem(SESSION_TOKEN_KEY, token)
}

function mockApi(overrides: Partial<SessionApi> = {}): SessionApi {
  return {
    getCurrentSession: vi.fn(async () => sessionResponse),
    deleteCurrentSession: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('useSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.sessionStorage.clear()
  })

  it('startet im Zustand unknown ohne bestätigte Anmeldung', () => {
    const store = useSessionStore()

    expect(store.status).toBe('unknown')
    expect(store.isAuthenticated).toBe(false)
    expect(store.hasToken).toBe(false)
  })

  it('behandelt ein persistiertes Token nicht als bestätigte Anmeldung', () => {
    seedPersistedToken('tok_persisted')
    const store = useSessionStore()

    // Token liegt vor, aber der Status bleibt bis zur Serverprüfung unknown.
    expect(store.hasToken).toBe(true)
    expect(store.status).toBe('unknown')
    expect(store.isAuthenticated).toBe(false)
  })

  it('gilt ohne Token nach der Prüfung als anonymous, ohne den Server zu fragen', async () => {
    const store = useSessionStore()
    const api = mockApi()
    store.useApi(api)

    await store.verify()

    expect(store.status).toBe('anonymous')
    expect(api.getCurrentSession).not.toHaveBeenCalled()
  })

  it('bestätigt eine Session serverseitig anhand des persistierten Tokens', async () => {
    seedPersistedToken('tok_persisted')
    const store = useSessionStore()
    const api = mockApi()
    store.useApi(api)

    await store.verify()

    expect(store.status).toBe('authenticated')
    expect(store.isAuthenticated).toBe(true)
    expect(store.identity).toMatchObject({ accountId: 'acc_1', email: 'captain@example.test' })
    expect(store.sessionProvider.getToken()).toBe('tok_persisted')
  })

  it('setzt die Session bei 401 kontrolliert auf anonymous zurück und verwirft das Token', async () => {
    seedPersistedToken('tok_stale')
    const store = useSessionStore()
    store.useApi(
      mockApi({
        getCurrentSession: vi.fn(async () => {
          throw sessionInvalidError()
        }),
      }),
    )

    await store.verify()

    expect(store.status).toBe('anonymous')
    expect(store.hasToken).toBe(false)
    expect(store.identity).toBeNull()
    expect(globalThis.sessionStorage.getItem(SESSION_TOKEN_KEY)).toBeNull()
  })

  it('geht bei transientem Fehler in error, ohne das Token zu verwerfen', async () => {
    seedPersistedToken('tok_keep')
    const store = useSessionStore()
    store.useApi(
      mockApi({
        getCurrentSession: vi.fn(async () => {
          throw networkError('cor_1', new Error('offline'))
        }),
      }),
    )

    await store.verify()

    expect(store.status).toBe('error')
    expect(store.lastErrorCode).toBe('NETWORK_ERROR')
    // Token bleibt erhalten, damit eine spätere Prüfung erneut greifen kann.
    expect(store.hasToken).toBe(true)
  })

  it('prüft nur einmal und dedupliziert gleichzeitige Prüfungen', async () => {
    seedPersistedToken('tok_persisted')
    const store = useSessionStore()
    const api = mockApi()
    store.useApi(api)

    await Promise.all([store.ensureVerified(), store.ensureVerified()])
    await store.ensureVerified()

    expect(api.getCurrentSession).toHaveBeenCalledTimes(1)
  })

  it('übernimmt ein ausgegebenes Token als bestätigte Session', () => {
    const store = useSessionStore()

    store.adoptSession(sessionCreated satisfies SessionCreatedResponse)

    expect(store.status).toBe('authenticated')
    expect(store.sessionProvider.getToken()).toBe('tok_new')
    expect(globalThis.sessionStorage.getItem(SESSION_TOKEN_KEY)).toBe('tok_new')
  })

  it('meldet ab, entfernt Token und geschützten Zustand', async () => {
    seedPersistedToken('tok_active')
    const store = useSessionStore()
    const api = mockApi()
    store.useApi(api)
    await store.verify()
    expect(store.isAuthenticated).toBe(true)

    await store.logout()

    expect(api.deleteCurrentSession).toHaveBeenCalledTimes(1)
    expect(store.status).toBe('anonymous')
    expect(store.hasToken).toBe(false)
    expect(store.identity).toBeNull()
  })

  it('meldet auch bei Serverfehler lokal ab', async () => {
    seedPersistedToken('tok_active')
    const store = useSessionStore()
    store.useApi(
      mockApi({
        deleteCurrentSession: vi.fn(async () => {
          throw networkError('cor_2', new Error('offline'))
        }),
      }),
    )
    await store.verify()

    await store.logout()

    expect(store.status).toBe('anonymous')
    expect(store.hasToken).toBe(false)
  })

  it('setzt bei handleUnauthorized den geschützten Zustand zurück', async () => {
    seedPersistedToken('tok_active')
    const store = useSessionStore()
    store.useApi(mockApi())
    await store.verify()
    expect(store.isAuthenticated).toBe(true)

    store.handleUnauthorized()

    expect(store.status).toBe('anonymous')
    expect(store.hasToken).toBe(false)
  })
})
