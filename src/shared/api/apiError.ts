// Feature: GAL-API-CORE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitte "Fehlerformat", "HTTP-Statuscodes")

import type {
  ServerError,
  ServerErrorCode,
  ServerErrorDetail,
  ServerErrorResponse,
} from './contract'

/**
 * Ursachenklasse eines fehlgeschlagenen Aufrufs. `server` steht für einen vom Server
 * gemäß Vertrag gelieferten Fehlerkörper; die übrigen Klassen entstehen clientseitig,
 * wenn keine verwertbare Serverantwort vorliegt.
 */
export type ApiErrorKind = 'server' | 'http' | 'network' | 'timeout' | 'aborted' | 'unknown'

/** Für die UI aufbereiteter Fehler, unabhängig von der konkreten Transportursache. */
export interface UiError {
  readonly kind: ApiErrorKind
  /** Stabile, maschinenlesbare Fehlerkennung; bei Nicht-Server-Fehlern eine Client-Kennung. */
  readonly code: ServerErrorCode
  /** Menschenverständliche, lokalisierbare Meldung. */
  readonly message: string
  readonly correlationId?: string
  readonly status?: number
  readonly retryable: boolean
  readonly details: readonly ServerErrorDetail[]
  readonly currentStateVersion?: number
}

/**
 * Zentraler Client-Fehler. Übersetzt das Serververtrags-Fehlerformat sowie
 * Transportfehler (Netzwerk, Zeitüberschreitung, Abbruch) in eine einheitliche,
 * für die UI verwendbare Form. Spielregeln werden dabei nicht nachgebildet;
 * `code` und `message` stammen unverändert vom Server.
 */
export class ApiError extends Error implements UiError {
  readonly kind: ApiErrorKind
  readonly code: ServerErrorCode
  readonly correlationId?: string
  readonly status?: number
  readonly retryable: boolean
  readonly details: readonly ServerErrorDetail[]
  readonly currentStateVersion?: number

  constructor(init: {
    kind: ApiErrorKind
    code: ServerErrorCode
    message: string
    correlationId?: string
    status?: number
    retryable?: boolean
    details?: readonly ServerErrorDetail[]
    currentStateVersion?: number
    cause?: unknown
  }) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause })
    this.name = 'ApiError'
    this.kind = init.kind
    this.code = init.code
    this.correlationId = init.correlationId
    this.status = init.status
    this.retryable = init.retryable ?? false
    this.details = init.details ?? []
    this.currentStateVersion = init.currentStateVersion
  }

  /** Reine, serialisierbare Sicht für die UI ohne Stacktrace. */
  toUiError(): UiError {
    return {
      kind: this.kind,
      code: this.code,
      message: this.message,
      correlationId: this.correlationId,
      status: this.status,
      retryable: this.retryable,
      details: this.details,
      currentStateVersion: this.currentStateVersion,
    }
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/** Prüft, ob ein geparster Körper dem Serververtrags-Fehlerformat entspricht. */
function isServerErrorResponse(body: unknown): body is ServerErrorResponse {
  if (typeof body !== 'object' || body === null) return false
  const error = (body as { error?: unknown }).error
  if (typeof error !== 'object' || error === null) return false
  const e = error as Partial<ServerError>
  return typeof e.code === 'string' && typeof e.message === 'string'
}

/**
 * Erzeugt aus einer fehlerhaften Antwort einen `ApiError`. Enthält der Körper das
 * Vertrags-Fehlerformat, werden dessen Felder übernommen; andernfalls entsteht ein
 * generischer HTTP-Fehler, der keine unbekannten Serverdetails erfindet.
 */
export function apiErrorFromResponse(
  status: number,
  body: unknown,
  correlationId?: string,
): ApiError {
  if (isServerErrorResponse(body)) {
    const error = body.error
    return new ApiError({
      kind: 'server',
      code: error.code,
      message: error.message,
      correlationId: error.correlationId ?? correlationId,
      status,
      retryable: error.retryable,
      details: error.details ?? [],
      currentStateVersion: error.currentStateVersion,
    })
  }
  return new ApiError({
    kind: 'http',
    code: `HTTP_${status}`,
    message: `Unerwartete Serverantwort (HTTP ${status}).`,
    correlationId,
    status,
    retryable: status >= 500,
  })
}

export function networkError(correlationId: string, cause: unknown): ApiError {
  return new ApiError({
    kind: 'network',
    code: 'NETWORK_ERROR',
    message: 'Die Verbindung zum Server ist fehlgeschlagen.',
    correlationId,
    retryable: true,
    cause,
  })
}

export function timeoutError(correlationId: string, timeoutMs: number): ApiError {
  return new ApiError({
    kind: 'timeout',
    code: 'TIMEOUT',
    message: `Die Anfrage wurde nach ${timeoutMs} ms abgebrochen.`,
    correlationId,
    retryable: true,
  })
}

export function abortedError(correlationId: string): ApiError {
  return new ApiError({
    kind: 'aborted',
    code: 'ABORTED',
    message: 'Die Anfrage wurde abgebrochen.',
    correlationId,
    retryable: false,
  })
}

/**
 * Normalisiert einen beliebigen geworfenen Wert in eine für die UI verwendbare Sicht.
 * `ApiError` wird direkt übernommen; alles andere ergibt einen neutralen `unknown`-Fehler,
 * ohne interne Details oder erfundene Serverinformationen offenzulegen.
 */
export function toUiError(error: unknown): UiError {
  if (isApiError(error)) return error.toUiError()
  return {
    kind: 'unknown',
    code: 'UNKNOWN',
    message: 'Ein unerwarteter Fehler ist aufgetreten.',
    retryable: false,
    details: [],
  }
}
