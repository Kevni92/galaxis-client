// Feature: GAL-CAMPAIGN-CREATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Parameter "Idempotency-Key")

/**
 * Erzeugt einen Idempotenzschlüssel für genau einen fachlichen Kampagnenerstellungsversuch.
 *
 * Der Server dedupliziert anhand dieses Schlüssels: Eine identische Wiederholung liefert dieselbe
 * Kampagne, während abweichende Daten mit demselben Schlüssel als Konflikt abgelehnt werden. Der
 * Schlüssel muss daher pro logischem Versuch stabil bleiben und bei geänderten Daten neu entstehen.
 */
export type IdempotencyKeyFactory = () => string

function randomToken(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  // Fallback ohne WebCrypto: für die Deduplizierung ausreichend eindeutig, nicht sicherheitskritisch.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Standardfabrik im Format `idk_<token>`. */
export const createIdempotencyKey: IdempotencyKeyFactory = () => `idk_${randomToken()}`
