import { describe, expect, it, vi } from 'vitest'
import { createRestClient } from './restClient'
import { isApiError, type ApiError } from './apiError'
import { staticSessionProvider } from './session'
import type { ServerErrorResponse } from './contract'

function jsonResponse(status: number, body: unknown, init?: ResponseInit): Response {
  const hasBody = body !== undefined
  return new Response(hasBody ? JSON.stringify(body) : null, {
    status,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

/** Fetch-Mock, der nacheinander die vorbereiteten Antworten liefert und den Aufruf protokolliert. */
function mockFetch(...responses: Response[]) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const next = responses.shift()
    if (!next) throw new Error('Keine weitere Mock-Antwort vorbereitet')
    return next
  })
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

function headerOf(init: RequestInit, name: string): string | null {
  return new Headers(init.headers).get(name)
}

/** Führt einen Aufruf aus, der fehlschlagen muss, und gibt den geworfenen `ApiError` typisiert zurück. */
async function captureError(pending: Promise<unknown>): Promise<ApiError> {
  try {
    await pending
    throw new Error('Es wurde kein Fehler geworfen')
  } catch (e) {
    return e as ApiError
  }
}

describe('createRestClient', () => {
  it('liefert geparstes JSON und setzt Accept- und Korrelations-Header', async () => {
    const { fetch, calls } = mockFetch(jsonResponse(200, { id: 'cmp_1', ok: true }))
    const client = createRestClient({ baseUrl: '', fetch, correlationIdFactory: () => 'cor_test' })

    const result = await client.get<{ id: string }>('/api/v1/campaigns/cmp_1')

    expect(result).toEqual({ id: 'cmp_1', ok: true })
    expect(calls[0].url).toBe('/api/v1/campaigns/cmp_1')
    expect(headerOf(calls[0].init, 'Accept')).toBe('application/json')
    expect(headerOf(calls[0].init, 'X-Correlation-Id')).toBe('cor_test')
    expect(headerOf(calls[0].init, 'Authorization')).toBeNull()
  })

  it('setzt den Bearer-Header aus dem Session-Provider', async () => {
    const { fetch, calls } = mockFetch(jsonResponse(200, {}))
    const client = createRestClient({
      baseUrl: '',
      fetch,
      session: staticSessionProvider('tok_42'),
    })

    await client.get('/api/v1/auth/session')

    expect(headerOf(calls[0].init, 'Authorization')).toBe('Bearer tok_42')
  })

  it('serialisiert POST-Körper als JSON und setzt Methode und Content-Type', async () => {
    const { fetch, calls } = mockFetch(jsonResponse(202, { status: 'accepted' }))
    const client = createRestClient({ baseUrl: '', fetch })

    await client.post('/api/v1/campaigns/cmp_1/commands', { type: 'fleet.move.local' })

    expect(calls[0].init.method).toBe('POST')
    expect(headerOf(calls[0].init, 'Content-Type')).toBe('application/json')
    expect(calls[0].init.body).toBe('{"type":"fleet.move.local"}')
  })

  it('baut Query-Parameter und lässt undefined/null aus', async () => {
    const { fetch, calls } = mockFetch(jsonResponse(200, {}))
    const client = createRestClient({ baseUrl: 'https://api.example', fetch })

    await client.get('/api/v1/campaigns/cmp_1/changes', {
      query: { after: 1842, limit: 200, cursor: undefined },
    })

    expect(calls[0].url).toBe(
      'https://api.example/api/v1/campaigns/cmp_1/changes?after=1842&limit=200',
    )
  })

  it('behandelt leere Antworten (204) als undefined', async () => {
    const { fetch } = mockFetch(jsonResponse(204, undefined))
    const client = createRestClient({ baseUrl: '', fetch })

    await expect(client.del('/api/v1/campaigns/cmp_1/commands/cmd_1')).resolves.toBeUndefined()
  })

  it('toleriert unbekannte additive Felder in Erfolgsantworten', async () => {
    const { fetch } = mockFetch(
      jsonResponse(200, { id: 'sys_12', displayName: 'Tau Ceti', futureField: 7 }),
    )
    const client = createRestClient({ baseUrl: '', fetch })

    const result = await client.get<{ id: string }>('/api/v1/campaigns/cmp_1/systems/sys_12')

    expect(result).toMatchObject({ id: 'sys_12', displayName: 'Tau Ceti', futureField: 7 })
  })

  it('übersetzt das Vertrags-Fehlerformat zentral in einen ApiError', async () => {
    const errorBody: ServerErrorResponse = {
      error: {
        code: 'CONFLICT',
        message: 'Der Befehl kann im aktuellen Zustand nicht ausgeführt werden.',
        correlationId: 'cor_server',
        details: [{ field: 'payload.target.x', reason: 'TARGET_NOT_REACHABLE' }],
        retryable: false,
        currentStateVersion: 1846,
      },
    }
    const { fetch } = mockFetch(jsonResponse(409, errorBody))
    const client = createRestClient({
      baseUrl: '',
      fetch,
      correlationIdFactory: () => 'cor_client',
    })

    const error = await captureError(client.get('/api/v1/campaigns/cmp_1/state'))

    expect(isApiError(error)).toBe(true)
    expect(error.kind).toBe('server')
    expect(error.code).toBe('CONFLICT')
    expect(error.status).toBe(409)
    expect(error.correlationId).toBe('cor_server')
    expect(error.details).toEqual([{ field: 'payload.target.x', reason: 'TARGET_NOT_REACHABLE' }])
    expect(error.currentStateVersion).toBe(1846)
  })

  it('bildet Nicht-Vertragsfehler auf einen generischen HTTP-Fehler ab', async () => {
    const { fetch } = mockFetch(jsonResponse(500, 'gateway down'))
    const client = createRestClient({
      baseUrl: '',
      fetch,
      correlationIdFactory: () => 'cor_client',
    })

    const error = await captureError(client.get('/api/v1/campaigns'))

    expect(error.kind).toBe('http')
    expect(error.code).toBe('HTTP_500')
    expect(error.correlationId).toBe('cor_client')
    expect(error.retryable).toBe(true)
  })

  it('bildet einen fehlgeschlagenen fetch auf einen Netzwerkfehler ab', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof globalThis.fetch
    const client = createRestClient({ baseUrl: '', fetch })

    const error = await captureError(client.get('/api/v1/campaigns'))

    expect(error.kind).toBe('network')
    expect(error.retryable).toBe(true)
  })

  it('bricht bei externem Abbruchsignal mit einem Abort-Fehler ab', async () => {
    const hangingFetch = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })) as unknown as typeof globalThis.fetch
    const client = createRestClient({ baseUrl: '', fetch: hangingFetch })

    const controller = new AbortController()
    const pending = client.get('/api/v1/campaigns', { signal: controller.signal })
    controller.abort()

    const error = await captureError(pending)
    expect(error.kind).toBe('aborted')
  })

  it('erzwingt eine Zeitüberschreitung', async () => {
    const hangingFetch = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })) as unknown as typeof globalThis.fetch
    const client = createRestClient({ baseUrl: '', fetch: hangingFetch })

    const error = await captureError(client.get('/api/v1/campaigns', { timeoutMs: 10 }))

    expect(error.kind).toBe('timeout')
    expect(error.retryable).toBe(true)
  })
})
