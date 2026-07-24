// Feature: GAL-CLIENT-SHELL-001
// Fachliche Grundlage: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md
// REST-Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (servers: "/")

/**
 * Zur Laufzeit aufgelöste Clientkonfiguration.
 *
 * Der Server bleibt fachlich autoritativ; der Client hält hier ausschließlich
 * technische Einstellungen wie die konfigurierbare API-Basis-URL.
 */
export interface AppConfig {
  /**
   * Basis-URL der Galaxis-REST-API ohne abschließenden Schrägstrich.
   * Leerer String bedeutet server-relative Aufrufe gemäß OpenAPI-Vertrag (`servers: "/"`).
   */
  readonly apiBaseUrl: string
}

/** Für die Auflösung relevanter Ausschnitt der Umgebungsvariablen (injizierbar für Tests). */
export type ClientEnv = { readonly VITE_API_BASE_URL?: string }

/** Entfernt genau einen abschließenden Schrägstrich, damit Pfade sauber angehängt werden können. */
function normalizeBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  return value.endsWith('/') ? value.slice(0, -1) : value
}

/**
 * Liest die Konfiguration aus den Vite-Umgebungsvariablen.
 * `env` ist injizierbar, damit die Auflösung ohne Build-Kontext testbar bleibt.
 */
export function resolveAppConfig(env: ClientEnv = import.meta.env): AppConfig {
  return {
    apiBaseUrl: normalizeBaseUrl(env.VITE_API_BASE_URL),
  }
}

/**
 * Baut aus der Basis-URL und einem API-Pfad eine vollständige Request-URL.
 * Bei leerer Basis-URL bleibt der Aufruf server-relativ.
 */
export function apiUrl(path: string, config: AppConfig = resolveAppConfig()): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${config.apiBaseUrl}${suffix}`
}

/** Für die App zur Startzeit aufgelöste Konfiguration. */
export const appConfig: AppConfig = resolveAppConfig()
