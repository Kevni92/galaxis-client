# features/colony – Heimatplanet- und Koloniedetail (modal)

Feature-ID: `GAL-COLONY-HOME-001`

Zeigt beim Auswählen eines Planeten ein modales, tastaturbedienbares Detailfenster über der bekannten
3D-Systemansicht (Issue #9, Decision 0007). Die Systemszene bleibt als Arbeitsfläche im Hintergrund.
Das Fenster stellt Planetengrunddaten, Kolonieidentität und -status, die Bevölkerungs- und die
Grundversorgungszusammenfassung dar – ausschließlich serverbekannte, über Linkrelationen geladene
Werte. Prognosen (Reichweite) tragen einen Datenstand. Es gibt keine editierbaren Steuerelemente ohne
Serverbefehl; der Client leitet keine Kolonie, Zugehörigkeit oder Kennzahl selbst ab.

| Datei                    | Verantwortung                                                                       | Fachliche Quelle                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `colonyApi.ts`           | Lädt Kolonieübersicht, Bevölkerung und Grundversorgung über Linkrelationen          | [`docs/contracts/rest-api/galaxis-rest-v1-a1.yaml`](../../../docs/contracts/rest-api/galaxis-rest-v1-a1.yaml) (`/colonies`, `/population`, `/economy`) |
| `colonyStore.ts`         | Pinia-Store: Übersicht laden, Planet→Kolonie auflösen, Detail laden, Auswahlzustand | dito                                                                                                                                                   |
| `colonyFormat.ts`        | Eindeutige, zeitzonenstabile Formatierung von Mengen und Datenstand                 | dito                                                                                                                                                   |
| `ColonyDetailWindow.vue` | Modales Detailfenster mit Tabs, Property-Grids und Datenstand für Prognosen         | dito + [`docs/decisions/0007-...md`](../../../docs/decisions/0007-client-ui-rendering-und-lokalisierung.md)                                            |

## Datenfluss

1. Die Kampagnen-App-Shell (`features/campaign/CampaignView.vue`) lädt nach `ready` die Übersicht über
   die Linkrelation `links.colonies` aus dem Kampagnenzustand.
2. Wählt die Systemansicht (`features/galaxy`) einen Planeten aus (Szene, Liste oder URL), setzt die
   Shell `colonyStore.selectPlanet(planetId, { homeworldEligible })`. Der Store löst die serverseitig
   markierte Heimatkolonie auf und lädt deren
   Bevölkerung und Grundversorgung über die Kolonie-Linkrelationen.
3. `ColonyDetailWindow` liest den Detailzustand und zeigt ihn in Tabs (Übersicht, Bevölkerung,
   Grundversorgung). Das Fenster öffnet die Shell, solange ein Planet gewählt ist.

## Zustände und Zugänglichkeit

- Das Fenster ist modal, per ESC und Schließen-Aktion schließbar; der Fokus bleibt eingeschlossen und
  kehrt beim Schließen zurück (siehe [`shared/ui/ModalWindow.vue`](../../shared/ui/README.md)).
- Ein bekannter Planet ohne sichtbare Kolonie erhält den klaren Zustand `no-colony`; Bevölkerungs- und
  Grundversorgungs-Tabs entfallen dann.
- Prognosen (Reichweite) sind als solche gekennzeichnet und tragen den serverseitigen Datenstand.
- Es werden nur serverbekannte Objekte und Eigenschaften dargestellt; nichts wird über das Fenster
  geleakt.

## Bekannte Folgearbeit

- Sichtbare Namen stammen aktuell direkt aus den Server-`displayNameKey`s. Die Auflösung über eine
  YAML-Lokalisierungsschicht (Decision 0007) folgt als eigener Schritt.

## Abhängigkeiten

- [`shared/api`](../../shared/api/README.md) für den REST-Client, `UiError` und `toUiError`.
- [`shared/ui`](../../shared/ui/README.md) für `ModalWindow` und `ErrorNotice`.
- `features/galaxy` liefert die Planetenauswahl (nur strukturell über die Shell, keine Modulkopplung).
- `pinia`.

## Verdrahtung

`main.ts` bindet die `ColonyApi` über `useApi` an den Store. `CampaignView` lädt die Übersicht, spiegelt
die Planetenauswahl der Systemansicht in den Store und rendert `ColonyDetailWindow`, solange ein Planet
gewählt ist.
