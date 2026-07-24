// Feature: GAL-CAMPAIGN-CREATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Abschnitt "Error", Response "InvalidCampaign")

import type { UiError } from '@/shared/api'

/**
 * Für das Erstellformular aufbereiteter Fehler. Der Server bleibt maßgeblich: Seine generische
 * Meldung wird unverändert übernommen und feldbezogene Details werden getrennt dargestellt, ohne
 * zusätzliche Regeln zu erfinden.
 */
export interface CampaignFormError {
  /** Allgemeine, feldunabhängige Meldung für den Formularkopf. */
  readonly message: string
  /** Feldbezogene Meldungen, indexiert nach Feldname des Vertrags (z. B. `timeProfile`). */
  readonly fieldErrors: Readonly<Record<string, string>>
}

/** Fallback, wenn keine verwertbare Serverantwort vorliegt. */
const GENERIC_MESSAGE = 'Kampagne konnte nicht erstellt werden. Bitte später erneut versuchen.'

/** Meldung für nicht erreichbaren Server; trennt einen Serverausfall von abgelehnten Eingaben. */
const UNREACHABLE_MESSAGE = 'Server nicht erreichbar. Bitte Verbindung prüfen und erneut versuchen.'

/**
 * Kurze, verständliche Meldung je maschinenlesbarem Feldgrund. Unbekannte Gründe erhalten eine
 * neutrale Meldung, damit das Formular keine internen Codes anzeigt.
 */
function fieldReasonMessage(reason: string): string {
  switch (reason) {
    case 'REQUIRED':
      return 'Pflichtfeld.'
    case 'INVALID_FORMAT':
      return 'Ungültiges Format.'
    case 'OUT_OF_RANGE':
      return 'Wert liegt außerhalb des zulässigen Bereichs.'
    case 'INVALID_TIME_PROFILE':
      return 'Zeitprofil wird vom Server nicht unterstützt.'
    case 'INVALID_SEED':
      return 'Seed wird vom Server nicht akzeptiert.'
    default:
      return 'Ungültige Eingabe.'
  }
}

/**
 * Übersetzt einen aufbereiteten REST-Fehler in die für das Formular nutzbare Form. Serverfehler
 * behalten ihre generische Meldung; Feld-Details werden auf verständliche Feldmeldungen abgebildet.
 * Details mit dem allgemeinen Feld `campaign` bleiben feldunabhängig und erscheinen nur im
 * Formularkopf.
 */
export function extractCampaignError(error: UiError): CampaignFormError {
  if (error.kind === 'network' || error.kind === 'timeout') {
    return { message: UNREACHABLE_MESSAGE, fieldErrors: {} }
  }
  if (error.kind === 'unknown') {
    return { message: GENERIC_MESSAGE, fieldErrors: {} }
  }
  const fieldErrors: Record<string, string> = {}
  for (const detail of error.details) {
    if (detail.field === 'campaign') continue
    // Erste Meldung je Feld gewinnt; weitere Gründe desselben Feldes werden nicht überschrieben.
    if (!(detail.field in fieldErrors))
      fieldErrors[detail.field] = fieldReasonMessage(detail.reason)
  }
  return { message: error.message, fieldErrors }
}
