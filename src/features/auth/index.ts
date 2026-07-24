// Feature: GAL-AUTH-SESSION-001
// Öffentliche Schnittstelle des Auth-Moduls: zentraler Anmeldezustand und geschützte Routen.

export { useSessionStore } from './sessionStore'
export type { SessionStatus, SessionIdentity, SessionStore } from './sessionStore'
export { createSessionApi } from './sessionApi'
export type { SessionApi, SessionResponse, SessionCreatedResponse } from './sessionApi'
export { createTokenStorage, SESSION_TOKEN_KEY } from './tokenStorage'
export type { TokenStorage, TokenStorageOptions } from './tokenStorage'
export { createSessionGuard } from './routerGuard'
export type { SessionGuardSource, SessionGuardOptions } from './routerGuard'
export { createAccountApi } from './accountApi'
export type {
  AccountApi,
  AccountResponse,
  CreateAccountRequest,
  SessionCredentialsRequest,
} from './accountApi'
export { useAccountStore } from './accountStore'
export type { AccountStore } from './accountStore'
export { extractAuthError } from './authError'
export type { AuthFormError } from './authError'
// Die Masken `AuthView`/`CredentialsForm` werden bewusst nicht über die Barrel exportiert,
// damit die Route sie weiterhin per Lazy-Import in einen eigenen Chunk laden kann.
