import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAccountStore } from './accountStore'
import { useSessionStore } from './sessionStore'
import type { AccountApi } from './accountApi'

const created = {
  sessionId: 'ses_1',
  accountId: 'acc_1',
  email: 'captain@example.test',
  token: 'tok_new',
  createdAt: '2026-07-24T12:00:00Z',
  expiresAt: '2026-07-25T12:00:00Z',
}

const account = {
  accountId: 'acc_1',
  email: 'captain@example.test',
  createdAt: '2026-07-24T12:00:00Z',
}

function mockApi(overrides: Partial<AccountApi> = {}): AccountApi {
  return {
    register: vi.fn(async () => account),
    login: vi.fn(async () => created),
    ...overrides,
  }
}

describe('useAccountStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.sessionStorage.clear()
  })

  it('wirft ohne initialisierte API einen erklärenden Fehler', async () => {
    const store = useAccountStore()

    await expect(store.login({ email: 'a@b.test', password: 'pw' })).rejects.toThrow(/useApi/)
  })

  it('registriert über die API, ohne den Nutzer anzumelden', async () => {
    const api = mockApi()
    const store = useAccountStore()
    store.useApi(api)

    const result = await store.register({ email: 'captain@example.test', password: 'pw' })

    expect(api.register).toHaveBeenCalledWith({ email: 'captain@example.test', password: 'pw' })
    expect(result).toEqual(account)
    expect(useSessionStore().isAuthenticated).toBe(false)
  })

  it('übernimmt bei erfolgreicher Anmeldung die Session als bestätigten Zustand', async () => {
    const api = mockApi()
    const store = useAccountStore()
    store.useApi(api)

    await store.login({ email: 'captain@example.test', password: 'pw' })

    const session = useSessionStore()
    expect(api.login).toHaveBeenCalledOnce()
    expect(session.isAuthenticated).toBe(true)
    expect(session.identity?.email).toBe('captain@example.test')
    expect(session.hasToken).toBe(true)
  })

  it('lässt Anmeldefehler unverändert durch und meldet nicht an', async () => {
    const api = mockApi({
      login: vi.fn(async () => {
        throw new Error('abgelehnt')
      }),
    })
    const store = useAccountStore()
    store.useApi(api)

    await expect(store.login({ email: 'a@b.test', password: 'pw' })).rejects.toThrow('abgelehnt')
    expect(useSessionStore().isAuthenticated).toBe(false)
  })
})
