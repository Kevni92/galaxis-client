// Feature: GAL-GALAXY-HOME-VIEW-001
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md (Meshgröße rein präsentational)
//
// Reine Rahmungs- und Größenmathematik der Systemszene (kein Three.js, keine Spielregel). Die
// XY-Positionen bleiben serverautoritativ; nur die sichtbare Körpergröße und der Kameraabstand werden
// aus der Ausdehnung des Systems abgeleitet, damit Stern und Planeten nicht als Punkte erscheinen.

import type { SceneObject } from './systemScene'

/** Mindest-Sichtradius, damit sehr kompakte Systeme nicht übermäßig herangezoomt werden. */
export const MIN_VIEW_RADIUS = 20

const STAR_RADIUS_FRACTION = 0.08
const PLANET_RADIUS_FRACTION = 0.045
const MIN_STAR_RADIUS = 3
const MIN_PLANET_RADIUS = 1.6

/** Sichtradius, der alle bekannten Objekte samt Rand einschließt; Grundlage für Kamera und Größe. */
export function viewRadiusFor(objects: readonly SceneObject[]): number {
  let radius = MIN_VIEW_RADIUS
  for (const object of objects) radius = Math.max(radius, Math.hypot(object.x, object.y) + 8)
  return radius
}

/**
 * Präsentationale Körpergröße relativ zur Systemausdehnung, mit sichtbarer Mindestgröße. Ohne diese
 * Skalierung sind feste Radien gegenüber der autoritativen Ausdehnung zu klein und wirken als Punkte.
 */
export function bodyRadius(kind: SceneObject['kind'], viewRadius: number): number {
  return kind === 'star'
    ? Math.max(MIN_STAR_RADIUS, viewRadius * STAR_RADIUS_FRACTION)
    : Math.max(MIN_PLANET_RADIUS, viewRadius * PLANET_RADIUS_FRACTION)
}
