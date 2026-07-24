import { describe, expect, it } from 'vitest'
import { MIN_VIEW_RADIUS, bodyRadius, viewRadiusFor } from './framing'
import type { SceneObject } from './systemScene'

function planet(x: number, y: number): SceneObject {
  return { id: `pln_${x}_${y}`, kind: 'planet', x, y, renderKind: 'terrestrial_planet' }
}

describe('framing', () => {
  it('nutzt den Mindestradius, wenn keine Objekte vorhanden sind', () => {
    expect(viewRadiusFor([])).toBe(MIN_VIEW_RADIUS)
  })

  it('umschließt das entfernteste Objekt samt Rand', () => {
    // hypot(120.5, -44) ≈ 128.28, plus 8 Rand.
    expect(viewRadiusFor([planet(120.5, -44)])).toBeCloseTo(136.28, 2)
  })

  it('skaliert die Körpergröße mit der Systemausdehnung', () => {
    const viewRadius = 136
    expect(bodyRadius('planet', viewRadius)).toBeCloseTo(6.12, 2)
    expect(bodyRadius('star', viewRadius)).toBeCloseTo(10.88, 2)
    // Ein Stern ist größer dargestellt als ein Planet im selben System.
    expect(bodyRadius('star', viewRadius)).toBeGreaterThan(bodyRadius('planet', viewRadius))
  })

  it('hält für kompakte Systeme sichtbare Mindestgrößen ein', () => {
    expect(bodyRadius('planet', MIN_VIEW_RADIUS)).toBe(1.6)
    expect(bodyRadius('star', MIN_VIEW_RADIUS)).toBe(3)
  })
})
