// Feature: GAL-API-CORE-001
// Öffentliche Schnittstelle der zentralen REST-Schicht. Komponenten und Stores
// verwenden ausschließlich diese Exporte statt `fetch` direkt aufzurufen.

export { createRestClient } from './restClient'
export type {
  RestClient,
  RestClientOptions,
  RequestOptions,
  HttpMethod,
  QueryValue,
} from './restClient'
export {
  ApiError,
  isApiError,
  apiErrorFromResponse,
  networkError,
  timeoutError,
  abortedError,
} from './apiError'
export type { ApiErrorKind, UiError } from './apiError'
export { anonymousSession, staticSessionProvider } from './session'
export type { SessionProvider } from './session'
export { createCorrelationId } from './correlation'
export type { CorrelationIdFactory } from './correlation'
export type {
  AuthSchemas,
  GameSchemas,
  ServerError,
  ServerErrorResponse,
  ServerErrorDetail,
  ServerErrorCode,
  authPaths,
  gamePaths,
} from './contract'
