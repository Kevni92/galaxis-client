# features/campaign – Kampagnenliste, Erstellung und Zustandsbootstrap

Feature-IDs: `GAL-CAMPAIGN-CREATE-001` (Liste/Erstellung), `GAL-API-A1-STATE-001` (Kampagnen-App-Shell und Zustandsbootstrap)

Auflisten der für den Account sichtbaren Kampagnen, Erstellen einer neuen A1-Singleplayer-Kampagne
und Laden des kompakten Kampagnenzustands der ausgewählten Kampagne. Der Server ist autoritativ:
Status, Zeitprofil, Balancing- und Zustandsversion werden unverändert übernommen; unbekannte
Zusatzfelder stören nicht, und der Client erfindet keine lokalen Defaultregeln. Ein Idempotenzschlüssel
pro fachlichem Erstellversuch verhindert Doppelanlagen. Detailressourcen folgen den serverseitigen
Linkrelationen statt selbst gebauter URLs.

| Datei                    | Verantwortung                                                                            | Fachliche Quelle                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `campaignApi.ts`         | Wrapper um `GET`/`POST /api/v1/campaigns` und `GET .../state` (mit ETag) auf dem Client  | [`docs/contracts/rest-api/galaxis-rest-v1-a1.yaml`](../../../docs/contracts/rest-api/galaxis-rest-v1-a1.yaml) (`/campaigns`) |
| `campaignStore.ts`       | Pinia-Store: Liste laden, Kampagne erstellen, Lade- und Fehlerzustände                   | dito                                                                                                                         |
| `campaignStateStore.ts`  | Pinia-Store: kompakten Kampagnenzustand nach ID laden, `stateVersion`/ETag/Links merken  | dito (`/campaigns/{campaignId}/state`)                                                                                       |
| `campaignError.ts`       | Übersetzt Serverfehler in allgemeine und feldbezogene Formularmeldungen                  | dito (`Error`, `InvalidCampaign`)                                                                                            |
| `idempotency.ts`         | Erzeugt den Idempotenzschlüssel pro Erstellversuch                                       | dito (Parameter `Idempotency-Key`)                                                                                           |
| `CreateCampaignForm.vue` | Formular für Seed und Zeitprofil inkl. Schlüssel-Lebenszyklus und Doppelklickschutz      | dito                                                                                                                         |
| `CampaignListView.vue`   | Kampagnenliste, Erstelldialog und Weiterleitung zur Übersicht (`/campaigns`)             | dito                                                                                                                         |
| `CampaignView.vue`       | Kampagnen-App-Shell mit Kontextpfad, Systemroute und modaler Deep-Link-Wiederherstellung | dito (`/campaigns/{campaignId}/systems/{systemId}`)                                                                          |
| `campaignNavigation.ts`  | Validiert Fenster- und Tabzustand aus `object`-/`window`-/`tab`-Queries                  | Decision 0007, UI-Vertrag `raumansichten-auswahl-und-kontextaktionen.md`                                                     |

## Idempotenz und Doppelabsenden

- Der Schlüssel gilt pro logischem Versuch: Eine Wiederholung derselben Daten verwendet denselben
  Schlüssel (Server liefert dieselbe Kampagne), geänderte Daten erzeugen einen neuen Schlüssel
  (kein Konflikt mit alten Daten).
- Zusätzlich sperrt der Ladezustand ein Doppelabsenden, sodass ein Doppelklick nur einen Request auslöst.

## Zustandsbootstrap

- `campaignStateStore.loadState(id)` markiert den Zustand erst nach der Serverantwort als geladen
  und speichert `stateVersion` und ETag der reichsspezifischen Sicht.
- Ein Kampagnenwechsel verwirft zuerst den alten Zustand, damit keine fremden Daten sichtbar bleiben.
- Fehlender Zugriff (`404`/`403`) wird als neutrale Serverfehlermeldung dargestellt, ohne interne
  Details oder die Existenz fremder Kampagnen zu verraten.
- Die `links`-Relationen bilden die Grundlage der weiteren A1-Navigation: `links.galaxy` speist die
  eingebettete 3D-Heimatsystemansicht ([`features/galaxy`](../galaxy/README.md)); modale Detailfenster
  für `colonies`/`population`/`economy` (#10) hängen sich an dieselben Relationen an.

## Abhängigkeiten

- [`shared/api`](../../shared/api/README.md) für den REST-Client (inkl. `getDetailed`/`ApiResponse`),
  `ApiError`/`UiError` und `toUiError`.
- [`shared/ui`](../../shared/ui/README.md) für `ErrorNotice`.
- `pinia` für die Stores, `vue-router` für Weiterleitung und Deep Links.

## Verdrahtung

`main.ts` erzeugt die `CampaignApi` einmal und bindet sie über `useApi` an `campaignStore` und
`campaignStateStore`. Die Routen `/campaigns` (Liste/Erstellen), `/campaigns/:campaignId` und
`/campaigns/:campaignId/systems/:systemId` (App-Shell und kanonischer Deep Link) tragen
`meta.requiresAuth`; Fenster- und Auswahlzustand bleiben als Clientzustand in den Queries.
