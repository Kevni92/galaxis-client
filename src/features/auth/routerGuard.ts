// Feature: GAL-AUTH-SESSION-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")

import type { NavigationGuardWithThis, RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import type { SessionStatus } from './sessionStore'

/**
 * Minimale Sicht auf den Session-Store, die der Guard benötigt. Die Einschränkung hält
 * den Guard testbar, ohne den vollständigen Pinia-Store nachzubilden.
 */
export interface SessionGuardSource {
  readonly isAuthenticated: boolean
  ensureVerified(): Promise<SessionStatus>
}

export interface SessionGuardOptions {
  /**
   * Zielroute für nicht angemeldete Zugriffe auf geschützte Seiten.
   * Der ursprüngliche Pfad wird als `redirect`-Query mitgegeben. Standard ist `home`.
   */
  redirectTo?: (to: RouteLocationNormalized) => RouteLocationRaw
}

/** Kennzeichnet eine Route als geschützt: `meta: { requiresAuth: true }`. */
function requiresAuth(to: RouteLocationNormalized): boolean {
  return to.matched.some((record) => record.meta.requiresAuth === true)
}

function defaultRedirect(to: RouteLocationNormalized): RouteLocationRaw {
  return { name: 'home', query: { redirect: to.fullPath } }
}

/**
 * Erzeugt einen Navigations-Guard, der geschützte Seiten erst nach serverseitig
 * bestätigter Session öffnet. Öffentliche Routen bleiben unberührt; für geschützte
 * Routen wird die Session bei Bedarf einmalig geprüft.
 */
export function createSessionGuard(
  session: SessionGuardSource,
  options: SessionGuardOptions = {},
): NavigationGuardWithThis<undefined> {
  const redirectTo = options.redirectTo ?? defaultRedirect

  return async (to) => {
    if (!requiresAuth(to)) return true
    await session.ensureVerified()
    if (session.isAuthenticated) return true
    return redirectTo(to)
  }
}
