import { describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { createSessionGuard, type SessionGuardSource } from './routerGuard'
import type { SessionStatus } from './sessionStore'

/** Baut eine minimale Zielroute mit optional geschütztem `meta`-Flag. */
function route(fullPath: string, requiresAuth: boolean): RouteLocationNormalized {
  return {
    fullPath,
    matched: [{ meta: requiresAuth ? { requiresAuth: true } : {} }],
    meta: requiresAuth ? { requiresAuth: true } : {},
  } as unknown as RouteLocationNormalized
}

function source(
  isAuthenticated: boolean,
  resolvedStatus: SessionStatus = isAuthenticated ? 'authenticated' : 'anonymous',
): SessionGuardSource {
  return {
    isAuthenticated,
    ensureVerified: vi.fn(async () => resolvedStatus),
  }
}

/** Ruft den Guard mit `undefined`-`this` auf, wie `router.beforeEach` es intern tut. */
function invoke(guard: ReturnType<typeof createSessionGuard>, to: RouteLocationNormalized) {
  return guard.call(undefined, to, route('/', false), () => {})
}

describe('createSessionGuard', () => {
  it('lässt öffentliche Routen ohne Prüfung passieren', async () => {
    const session = source(false)
    const guard = createSessionGuard(session)

    await expect(invoke(guard, route('/', false))).resolves.toBe(true)
    expect(session.ensureVerified).not.toHaveBeenCalled()
  })

  it('öffnet geschützte Routen erst nach bestätigter Session', async () => {
    const session = source(true)
    const guard = createSessionGuard(session)

    const result = await invoke(guard, route('/campaigns', true))

    expect(session.ensureVerified).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)
  })

  it('leitet nicht angemeldete Zugriffe mit redirect-Query um', async () => {
    const session = source(false)
    const guard = createSessionGuard(session)

    const result = await invoke(guard, route('/campaigns', true))

    expect(session.ensureVerified).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ name: 'home', query: { redirect: '/campaigns' } })
  })

  it('verwendet ein konfiguriertes Umleitungsziel', async () => {
    const session = source(false)
    const guard = createSessionGuard(session, {
      redirectTo: (to) => ({ name: 'login', query: { next: to.fullPath } }),
    })

    const result = await invoke(guard, route('/campaigns', true))

    expect(result).toEqual({ name: 'login', query: { next: '/campaigns' } })
  })
})
