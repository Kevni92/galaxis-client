// Feature: GAL-AUTH-SESSION-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")

/**
 * Speicher für das Bearer-Token einer Session.
 *
 * Das Token liegt immer im Arbeitsspeicher; für A0 kann es zusätzlich in `sessionStorage`
 * gespiegelt werden, damit ein Seiten-Reload dieselbe Serversession erneut bestätigen kann.
 * Persistenz ist bewusst optional und keine bestätigte Anmeldung: Der Zustand `authenticated`
 * entsteht ausschließlich nach serverseitiger Prüfung (siehe `sessionStore`).
 */
export interface TokenStorage {
  /** Aktuelles Token oder `undefined`, wenn keines gespeichert ist. */
  get(): string | undefined
  set(token: string): void
  clear(): void
}

/** Schlüssel des optionalen `sessionStorage`-Eintrags. */
export const SESSION_TOKEN_KEY = 'galaxis.session.token'

export interface TokenStorageOptions {
  /**
   * Ob das Token zusätzlich in `sessionStorage` gespiegelt wird. Standard ist `true`,
   * degradiert aber still zu reinem Speicher, wenn `sessionStorage` nicht verfügbar ist.
   */
  persist?: boolean
  /** Injizierbar für Tests; Standard ist das globale `sessionStorage`, falls vorhanden. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
  key?: string
}

/** Liest `sessionStorage`, ohne bei blockiertem Zugriff (Privatmodus) zu werfen. */
function resolveStorage(
  option: TokenStorageOptions['storage'],
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  if (option !== undefined) return option
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

/**
 * Erzeugt einen Token-Speicher. Ein bereits vorhandenes persistiertes Token wird beim
 * Anlegen in den Speicher übernommen, damit ein Reload das Token erneut prüfen lassen kann.
 */
export function createTokenStorage(options: TokenStorageOptions = {}): TokenStorage {
  const key = options.key ?? SESSION_TOKEN_KEY
  const persist = options.persist ?? true
  const storage = persist ? resolveStorage(options.storage) : null

  let token = readPersisted()

  function readPersisted(): string | undefined {
    if (!storage) return undefined
    try {
      return storage.getItem(key) ?? undefined
    } catch {
      return undefined
    }
  }

  return {
    get: () => token,
    set: (next) => {
      token = next
      try {
        storage?.setItem(key, next)
      } catch {
        // Persistenz ist optional; ein Fehlschlag darf die Session nicht verhindern.
      }
    },
    clear: () => {
      token = undefined
      try {
        storage?.removeItem(key)
      } catch {
        // Siehe oben: Persistenz darf den Ablauf nicht blockieren.
      }
    },
  }
}
