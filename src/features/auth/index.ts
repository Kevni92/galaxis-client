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
