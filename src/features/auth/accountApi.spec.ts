import { describe, expect, it, vi } from 'vitest'
import type { RestClient } from '@/shared/api'
import { createAccountApi } from './accountApi'

/** Minimaler REST-Client-Mock, der nur die von der Konto-API genutzten Methoden protokolliert. */
function mockClient(postResult: unknown = {}) {
  const post = vi.fn(async () => postResult)
  const client = { post } as unknown as RestClient
  return { client, post }
}

describe('createAccountApi', () => {
  it('registriert über POST /api/v1/auth/accounts mit den Zugangsdaten', async () => {
    const created = {
      accountId: 'acc_1',
      email: 'captain@example.test',
      createdAt: '2026-07-24T12:00:00Z',
    }
    const { client, post } = mockClient(created)

    const result = await createAccountApi(client).register({
      email: 'captain@example.test',
      password: 'correct-horse-battery-staple',
    })

    expect(post).toHaveBeenCalledWith('/api/v1/auth/accounts', {
      email: 'captain@example.test',
      password: 'correct-horse-battery-staple',
    })
    expect(result).toEqual(created)
  })

  it('meldet über POST /api/v1/auth/sessions an und gibt die erstellte Session zurück', async () => {
    const session = {
      sessionId: 'ses_1',
      accountId: 'acc_1',
      email: 'captain@example.test',
      token: 'tok_new',
      createdAt: '2026-07-24T12:00:00Z',
      expiresAt: '2026-07-25T12:00:00Z',
    }
    const { client, post } = mockClient(session)

    const result = await createAccountApi(client).login({
      email: 'captain@example.test',
      password: 'correct-horse-battery-staple',
    })

    expect(post).toHaveBeenCalledWith('/api/v1/auth/sessions', {
      email: 'captain@example.test',
      password: 'correct-horse-battery-staple',
    })
    expect(result).toEqual(session)
  })
})
