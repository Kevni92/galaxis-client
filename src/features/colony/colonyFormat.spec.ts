import { describe, expect, it } from 'vitest'
import { formatCoverageDays, formatInstant, formatInteger } from './colonyFormat'

describe('colonyFormat', () => {
  it('formatiert ganze Zahlen mit Tausendertrennung', () => {
    expect(formatInteger(1000000)).toBe('1.000.000')
    expect(formatInteger(0)).toBe('0')
  })

  it('kennzeichnet fehlende oder ungültige Mengen klar', () => {
    expect(formatInteger(null)).toBe('—')
    expect(formatInteger(undefined)).toBe('—')
    expect(formatInteger(Number.NaN)).toBe('—')
  })

  it('formatiert den Datenstand eindeutig in UTC', () => {
    expect(formatInstant('2026-07-23T12:00:00Z')).toBe('23.07.2026, 12:00 UTC')
  })

  it('lässt fehlende oder unlesbare Zeitpunkte klar erkennbar', () => {
    expect(formatInstant(null)).toBe('—')
    expect(formatInstant('kein-datum')).toBe('kein-datum')
  })

  it('kennzeichnet die Reichweite als Tagesprognose', () => {
    expect(formatCoverageDays(30)).toBe('30 Tage')
    expect(formatCoverageDays(null)).toBe('—')
  })
})
