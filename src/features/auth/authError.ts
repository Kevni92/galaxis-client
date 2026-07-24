// Feature: GAL-AUTH-ACCOUNT-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitte "Fehlerformat", "Authentifizierung")

import { isApiError } from '@/shared/api'

/**
 * Für die Anmeldemaske aufbereiteter Fehler. Der Server bleibt maßgeblich: Seine generische
 * Meldung wird unverändert übernommen und nach Feldern getrennt, ohne zusätzliche
 * Accountinformationen zu erfinden oder abzuleiten.
 */
export interface AuthFormError {
  /** Allgemeine, feldunabhängige Meldung für den Formularkopf. */
  readonly message: string
  /** Feldbezogene Meldungen, indexiert nach Feldname des Vertrags (z. B. `email`). */
  readonly fieldErrors: Readonly<Record<string, string>>
}

/** Fallback, wenn keine verwertbare Serverantwort vorliegt (Netzwerk, Timeout, Unbekanntes). */
const GENERIC_MESSAGE = 'Aktion fehlgeschlagen. Bitte später erneut versuchen.'

/**
 * Kurze, verständliche Meldung je maschinenlesbarem Feldgrund. Unbekannte Gründe erhalten
 * eine neutrale Meldung, damit die Maske keine internen Codes anzeigt.
 */
function fieldReasonMessage(reason: string): string {
  switch (reason) {
    case 'REQUIRED':
      return 'Pflichtfeld.'
    case 'INVALID_FORMAT':
      return 'Ungültiges Format.'
    case 'TOO_SHORT':
      return 'Zu kurz.'
    case 'TOO_LONG':
      return 'Zu lang.'
    default:
      return 'Ungültige Eingabe.'
  }
}

/**
 * Übersetzt einen beliebigen Fehler in die für die Maske nutzbare Form. Serverfehler behalten
 * ihre generische Meldung; Feld-Details werden auf verständliche Feldmeldungen abgebildet.
 */
export function extractAuthError(error: unknown): AuthFormError {
  if (isApiError(error)) {
    const fieldErrors: Record<string, string> = {}
    for (const detail of error.details) {
      // Erste Meldung je Feld gewinnt; weitere Gründe desselben Feldes werden nicht überschrieben.
      if (!(detail.field in fieldErrors))
        fieldErrors[detail.field] = fieldReasonMessage(detail.reason)
    }
    return { message: error.message, fieldErrors }
  }
  return { message: GENERIC_MESSAGE, fieldErrors: {} }
}
