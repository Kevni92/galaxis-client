// Feature: GAL-API-CORE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md
// Maschinenlesbar: docs/contracts/rest-api/galaxis-rest-v1.yaml (A0) + galaxis-rest-v1-a1.yaml (A1)

import type { components as authComponents, paths as authPaths } from './generated/galaxis-rest-v1'
import type {
  components as gameComponents,
  paths as gamePaths,
} from './generated/galaxis-rest-v1-a1'

/**
 * Beide OpenAPI-Dateien bilden gemeinsam den Vertrag der Hauptversion v1.
 * A0 deckt Health und Authentifizierung ab, A1 Kampagnen und Zustandsressourcen.
 * Die generierten Typen sind die einzige Quelle der Request-/Response-Formen –
 * eine Vertragsänderung ändert nach erneuter Generierung sichtbar diese Typen.
 */
export type { authPaths, gamePaths }
export type AuthSchemas = authComponents['schemas']
export type GameSchemas = gameComponents['schemas']

export type ServerErrorDetail = authComponents['schemas']['ErrorDetail']

/**
 * Bekannte stabile Fehlercodes aus beiden Verträgen.
 *
 * `(string & {})` hält den Typ offen, damit additiv ergänzte Codes toleriert werden,
 * ohne die Autovervollständigung der bekannten Codes zu verlieren.
 */
export type ServerErrorCode =
  | authComponents['schemas']['Error']['code']
  | gameComponents['schemas']['Error']['code']
  | (string & {})

/**
 * Kanonischer Serverfehlerkörper gemäß gemeinsamem Fehlerformat. Die Felder werden aus
 * den generierten Typen abgeleitet (A0 und A1 sind strukturgleich); nur `code` wird auf
 * die Codes beider Verträge geweitet. Eine Vertragsänderung an den Fehlerfeldern bricht
 * dadurch weiterhin sichtbar die Typprüfung.
 */
export type ServerError = Omit<authComponents['schemas']['Error'], 'code'> & {
  code: ServerErrorCode
}
export type ServerErrorResponse = { error: ServerError }
