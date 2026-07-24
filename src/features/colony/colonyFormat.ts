// Feature: GAL-COLONY-HOME-001
// Eindeutige, gebietsschema-stabile Darstellung serverautoritativer Kolonie-Werte. Es werden keine
// fachlichen Werte berechnet; nur bereits gelieferte Zahlen und Zeitpunkte werden lesbar formatiert.

const INTEGER_FORMAT = new Intl.NumberFormat('de-DE')

// Datenstand bewusst in UTC anzeigen, damit die Kennzeichnung unabhängig von der Zeitzone eindeutig ist.
const INSTANT_FORMAT = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

/** Formatiert eine ganzzahlige Menge mit Tausendertrennung; ungültige Werte bleiben als „—“ sichtbar. */
export function formatInteger(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return INTEGER_FORMAT.format(value)
}

/** Formatiert einen ISO-Zeitpunkt als eindeutigen UTC-Datenstand; ungültige Werte bleiben roh sichtbar. */
export function formatInstant(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${INSTANT_FORMAT.format(date)} UTC`
}

/** Kennzeichnet die A1-Reichweite als serverseitige Prognose mit Tageseinheit. */
export function formatCoverageDays(days: number | null | undefined): string {
  if (typeof days !== 'number' || !Number.isFinite(days)) return '—'
  return `${formatInteger(days)} Tage`
}
