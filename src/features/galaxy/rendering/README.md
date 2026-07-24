# features/galaxy/rendering – Gekapselte 3D-Rendering-Schicht

Feature-ID: `GAL-GALAXY-HOME-VIEW-001` · Designentscheidung: [`0007`](../../../../docs/decisions/0007-client-ui-rendering-und-lokalisierung.md)

Kleine, gekapselte Schicht für die 3D-Sternensystemansicht. Vue-Komponenten sprechen ausschließlich
das framework-neutrale `SystemScene`-Interface an und rufen Three.js nie direkt auf (Decision 0007,
Architekturregel 3). Die Schicht kennt Darstellungsobjekte, Kamera, Auswahl und Picking, aber keine
eigene Spielsimulation; visuelle Höhe, Größe und Animation sind rein präsentational.

| Datei                 | Verantwortung                                                                   |
| --------------------- | ------------------------------------------------------------------------------- |
| `systemScene.ts`      | `SystemScene`-Interface, `SceneObject` und `SystemSceneFactory` (Three.js-frei) |
| `threeSystemScene.ts` | Three.js-Implementierung; einzige Datei, die Three.js importiert                |
| `framing.ts`          | Reine Rahmungs-/Größenmathematik (Sichtradius, Körpergröße); Three.js-frei      |

## Grenze und Testbarkeit

- `HomeSystemView.vue` erhält eine injizierbare `SystemSceneFactory`. In Tests wird eine Fake-Szene
  übergeben, sodass Three.js/WebGL nicht geladen wird; in Produktion lädt die Komponente
  `threeSystemScene.ts` per dynamischem Import (eigener Chunk, nicht im Startbundle).
- Die fachliche XY-Ebene des Servers wird auf die horizontale XZ-Ebene abgebildet; die schräge
  Kamera erzeugt Tiefe. Die Y-Höhe bleibt 0 und besitzt keine fachliche Wirkung.
- Die sichtbare Körpergröße wird in `framing.ts` aus der Systemausdehnung abgeleitet (rein
  präsentational), damit weit außen liegende Planeten nicht als Punkte erscheinen. Diese Mathematik
  ist Three.js-frei und wird per Unit-Test geprüft; die WebGL-Szene selbst bleibt manuell.
