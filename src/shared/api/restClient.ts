// Feature: GAL-API-CORE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Anforderungen an Client")

import { appConfig } from '@/shared/config/appConfig'
import {
  abortedError,
  ApiError,
  apiErrorFromResponse,
  networkError,
  timeoutError,
} from './apiError'
import { createCorrelationId, type CorrelationIdFactory } from './correlation'
import { anonymousSession, type SessionProvider } from './session'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Zulässige Werte eines Query-Parameters; `undefined`/`null` werden ausgelassen. */
export type QueryValue = string | number | boolean | undefined | null

export interface RequestOptions {
  method?: HttpMethod
  /** Server-relativer Pfad inklusive `/api/v1`-Präfix, z. B. `/api/v1/campaigns`. */
  path: string
  query?: Record<string, QueryValue>
  /** Wird als JSON serialisiert; für GET/DELETE üblicherweise weggelassen. */
  body?: unknown
  headers?: Record<string, string>
  /** Externes Abbruchsignal des Aufrufers; wird mit dem internen Timeout kombiniert. */
  signal?: AbortSignal
  /** Überschreibt den Standard-Timeout dieses Aufrufs. */
  timeoutMs?: number
}

export interface RestClientOptions {
  /** Basis-URL ohne abschließenden Schrägstrich; Standard ist die aufgelöste App-Konfiguration. */
  baseUrl?: string
  session?: SessionProvider
  /** Injizierbar für Tests; Standard ist das globale `fetch`. */
  fetch?: typeof fetch
  /** Zeitüberschreitung je Anfrage in Millisekunden. */
  defaultTimeoutMs?: number
  correlationIdFactory?: CorrelationIdFactory
  /** Header-Name für die Request-Korrelation. */
  correlationHeader?: string
}

/**
 * Zentrale Fetch-Abstraktion. Jede REST-Nutzung im Client läuft über diesen Client,
 * damit keine Komponente `fetch` direkt aufruft. Der Client setzt Korrelations- und
 * Bearer-Header, erzwingt eine Zeitüberschreitung, unterstützt externe Abbruchsignale
 * und übersetzt Fehler zentral in `ApiError`.
 */
export interface RestClient {
  request<TResponse>(options: RequestOptions): Promise<TResponse>
  get<TResponse>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
  ): Promise<TResponse>
  post<TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
  ): Promise<TResponse>
  del<TResponse>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>,
  ): Promise<TResponse>
}

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_CORRELATION_HEADER = 'X-Correlation-Id'

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) search.append(key, String(value))
  }
  const queryString = search.toString()
  return `${baseUrl}${suffix}${queryString ? `?${queryString}` : ''}`
}

/** Liest den Antwortkörper als JSON; leere Antworten (z. B. `204`) ergeben `undefined`. */
async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function createRestClient(options: RestClientOptions = {}): RestClient {
  const baseUrl = options.baseUrl ?? appConfig.apiBaseUrl
  const session = options.session ?? anonymousSession
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
  const nextCorrelationId = options.correlationIdFactory ?? createCorrelationId
  const correlationHeader = options.correlationHeader ?? DEFAULT_CORRELATION_HEADER

  async function request<TResponse>(req: RequestOptions): Promise<TResponse> {
    const correlationId = nextCorrelationId()
    const method = req.method ?? 'GET'
    const url = buildUrl(baseUrl, req.path, req.query)

    const headers = new Headers(req.headers)
    headers.set('Accept', 'application/json')
    headers.set(correlationHeader, correlationId)

    const token = await session.getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    let bodyInit: string | undefined
    if (req.body !== undefined) {
      headers.set('Content-Type', 'application/json')
      bodyInit = JSON.stringify(req.body)
    }

    // Externes Signal und internen Timeout zu einem gemeinsamen Abbruchsignal kombinieren.
    const controller = new AbortController()
    const timeoutMs = req.timeoutMs ?? defaultTimeoutMs
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    const onExternalAbort = () => controller.abort()
    if (req.signal) {
      if (req.signal.aborted) controller.abort()
      else req.signal.addEventListener('abort', onExternalAbort, { once: true })
    }

    try {
      // Bereits abgebrochene Anfragen gar nicht erst absenden.
      if (controller.signal.aborted) {
        throw timedOut ? timeoutError(correlationId, timeoutMs) : abortedError(correlationId)
      }

      const response = await doFetch(url, {
        method,
        headers,
        body: bodyInit,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw apiErrorFromResponse(response.status, await parseJson(response), correlationId)
      }
      return (await parseJson(response)) as TResponse
    } catch (cause) {
      if (cause instanceof ApiError) throw cause
      if (isAbort(cause)) {
        throw timedOut ? timeoutError(correlationId, timeoutMs) : abortedError(correlationId)
      }
      throw networkError(correlationId, cause)
    } finally {
      clearTimeout(timeoutId)
      req.signal?.removeEventListener('abort', onExternalAbort)
    }
  }

  return {
    request,
    get: (path, opts) => request({ ...opts, path, method: 'GET' }),
    post: (path, body, opts) => request({ ...opts, path, method: 'POST', body }),
    del: (path, opts) => request({ ...opts, path, method: 'DELETE' }),
  }
}

/** Erkennt Abbruch-/Timeout-Ursachen; `DOMException` ist in Node kein `instanceof Error`. */
function isAbort(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null || !('name' in cause)) return false
  const name = (cause as { name: unknown }).name
  return name === 'AbortError' || name === 'TimeoutError'
}
