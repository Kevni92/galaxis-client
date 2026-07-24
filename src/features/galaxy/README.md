# features/galaxy – Bekannte Heimatsystemansicht

Feature-ID: `GAL-GALAXY-HOME-VIEW-001`

Lädt und zeigt das bekannte Heimatsternsystem als 3D-Szene mit gleichwertiger, tastaturbedienbarer
Objektliste (Decision 0007). Es erscheinen ausschließlich serverseitig bekannte Objekte mit ihren
autoritativen lokalen XY-Positionen; der Client leitet keine Objekte, Positionen, Reichweiten oder
Wissensstände selbst ab. Die visuelle Z-Höhe, Meshgröße und Animation sind rein präsentational. Die
Auswahl ist Clientzustand und bleibt über die URL nachvollziehbar.

| Datei                | Verantwortung                                                                     | Fachliche Quelle                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `galaxyApi.ts`       | Lädt Galaxieübersicht und System über Linkrelationen (keine selbst gebauten URLs) | [`docs/contracts/rest-api/galaxis-rest-v1-a1.yaml`](../../../docs/contracts/rest-api/galaxis-rest-v1-a1.yaml) (`/galaxy`, `/systems`) |
| `homeSystemStore.ts` | Pinia-Store: Galaxie→Heimatsystem laden, bekannte Objekte normalisieren, Auswahl  | dito                                                                                                                                  |
| `HomeSystemView.vue` | 3D-Szene + zugängliche Objektliste + URL-gespiegelte Auswahl und Auswahldetail    | dito + [`docs/decisions/0007-...md`](../../../docs/decisions/0007-client-ui-rendering-und-lokalisierung.md)                           |
| `rendering/`         | Gekapselte Three.js-Schicht hinter einem framework-neutralen Interface            | siehe [`rendering/README.md`](rendering/README.md)                                                                                    |

## Datenfluss

1. Die Kampagnen-App-Shell (`features/campaign/CampaignView.vue`) übergibt die Linkrelation
   `links.galaxy` aus dem Kampagnenzustand.
2. `homeSystemStore.loadFromGalaxy(galaxyLink)` lädt die Galaxieübersicht, ermittelt das Startsystem
   und folgt dessen `self`-Link zum Systemdetail.
3. Sterne und Planeten werden zu einer neutralen `SystemObject`-Liste (Liste) und `SceneObject`-Liste
   (Szene) normalisiert. `ready` gilt erst nach der Systemantwort.

## Auswahl und Zugänglichkeit

- Objektliste und 3D-Szene wählen dasselbe Objekt aus (Maus, Tastatur und Picking sind gleichwertig).
- Die Auswahl wird als `?object=<id>`-Query gespiegelt und beim Laden wiederhergestellt.
- Unbekannte oder nicht mehr vorhandene IDs werden verworfen; es wird nichts geleakt.
- `prefers-reduced-motion` deaktiviert die präsentationale Szenenrotation.

## Bekannte Folgearbeit

- Sichtbare Namen stammen aktuell direkt aus den Server-`displayNameKey`s. Die Auflösung über eine
  YAML-Lokalisierungsschicht (Decision 0007) folgt als eigener Schritt.
- Das modale Planet-/Koloniedetail beim Auswählen liefert `features/colony` (Issue #10); die Shell
  spiegelt die Planetenauswahl dorthin.

## Abhängigkeiten

- [`shared/api`](../../shared/api/README.md) für den REST-Client, `UiError` und `toUiError`.
- [`shared/ui`](../../shared/ui/README.md) für `ErrorNotice`.
- `pinia`, `vue-router` und `three` (nur in der gekapselten Rendering-Schicht).

## Verdrahtung

`main.ts` bindet die `GalaxyApi` über `useApi` an den Store. `CampaignView` lädt `HomeSystemView`
per Lazy-Import, damit Three.js außerhalb des Startbundles bleibt.
