// Feature: GAL-GALAXY-HOME-VIEW-001
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md (gekapselte Rendering-Schicht)
//
// Grenze zwischen Vue-Komponenten und Three.js: Komponenten sprechen ausschließlich dieses
// Interface an und rufen Three.js nie direkt auf (Decision 0007, Architekturregel 3). Die Szene
// kennt Darstellungsobjekte, Kamera, Auswahl und Picking, aber keine eigene Spielsimulation.

/** Ein darzustellendes, serverseitig bekanntes Raumobjekt. */
export interface SceneObject {
  /** Stabile Server-ID (Stern- oder Planet-ID). */
  id: string
  kind: 'star' | 'planet'
  /** Autoritative lokale XY-Position; fachlich maßgeblich. */
  x: number
  y: number
  /** Rein präsentationale Darstellungsfamilie des Servers (z. B. `yellow_star`). */
  renderKind: string
}

/**
 * Gekapselte Sternensystem-Szene. Eine visuelle Z-Höhe, Meshgröße oder Animation ist rein
 * präsentational und besitzt keine fachliche Wirkung (Decision 0007).
 */
export interface SystemScene {
  /** Setzt die darzustellenden Objekte; ersetzt den vorherigen Bestand vollständig. */
  setObjects(objects: readonly SceneObject[]): void
  /** Hebt das ausgewählte Objekt hervor; `null` hebt jede Hervorhebung auf. */
  setSelection(objectId: string | null): void
  /** Registriert den Callback für die Primärauswahl per Zeiger (Picking). */
  onSelect(handler: (objectId: string) => void): void
  /** Passt die Renderfläche an die Containergröße an. */
  resize(width: number, height: number): void
  /** Gibt GPU- und DOM-Ressourcen sowie laufende Animationen frei. */
  dispose(): void
}

/** Erzeugt eine Szene auf einem bereits im DOM montierten Canvas. */
export type SystemSceneFactory = (canvas: HTMLCanvasElement) => SystemScene
