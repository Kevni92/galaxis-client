// Feature: GAL-API-CORE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")

/**
 * Liefert das aktuelle Bearer-Token für geschützte Anfragen.
 *
 * Der REST-Client kennt die konkrete Anmeldemethode nicht. Er fragt vor jeder
 * geschützten Anfrage über diesen Provider das jeweils gültige Token ab. Fehlt ein
 * Token, wird kein `Authorization`-Header gesetzt; der Server antwortet dann mit `401`.
 */
export interface SessionProvider {
  /** Aktuelles Bearer-Token oder `undefined`, wenn keine Session besteht. */
  getToken(): string | undefined | Promise<string | undefined>
}

/** Provider ohne Session; setzt nie einen `Authorization`-Header. */
export const anonymousSession: SessionProvider = {
  getToken: () => undefined,
}

/**
 * Provider mit fester Tokenquelle.
 *
 * `token` kann ein statischer Wert oder eine Funktion sein, damit ein Session-Store
 * (galaxis-client#3) die Quelle später ohne Änderung am Client austauschen kann.
 */
export function staticSessionProvider(token: string | (() => string | undefined)): SessionProvider {
  return {
    getToken: () => (typeof token === 'function' ? token() : token),
  }
}
