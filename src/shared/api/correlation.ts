// Feature: GAL-API-CORE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Fehlerformat", correlationId)

/**
 * Erzeugt eine clientseitige Korrelationskennung für einen einzelnen Request.
 *
 * Die Kennung wird als Anfrage-Header mitgesendet, damit Client-Log, Netzwerk und
 * Serverprotokoll einer Anfrage zugeordnet werden können. Der Server darf in
 * Fehlerantworten eine eigene `correlationId` liefern; diese hat dann Vorrang.
 */
export type CorrelationIdFactory = () => string

function randomToken(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  // Fallback ohne WebCrypto: ausreichend eindeutig für Request-Korrelation, nicht sicherheitskritisch.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Standardfabrik für Korrelationskennungen im Format `cor_<token>`. */
export const createCorrelationId: CorrelationIdFactory = () => `cor_${randomToken()}`
