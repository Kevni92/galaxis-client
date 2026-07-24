# features/campaign – Kampagnenliste und Kampagnenerstellung

Feature-ID: `GAL-CAMPAIGN-CREATE-001`

Auflisten der für den Account sichtbaren Kampagnen und Erstellen einer neuen A1-Singleplayer-Kampagne.
Der Server ist autoritativ: Status, Zeitprofil, Balancing- und Zustandsversion werden unverändert
übernommen; der Client erfindet keine lokalen Defaultregeln. Ein Idempotenzschlüssel pro fachlichem
Erstellversuch verhindert Doppelanlagen. Der kompakte Kampagnenzustand und die Game-Shell-Navigation
folgen in Issue #8 (`GAL-API-A1-STATE-001`).

| Datei                    | Verantwortung                                                                       | Fachliche Quelle                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `campaignApi.ts`         | Wrapper um `GET`/`POST /api/v1/campaigns` auf dem zentralen Client                  | [`docs/contracts/rest-api/galaxis-rest-v1-a1.yaml`](../../../docs/contracts/rest-api/galaxis-rest-v1-a1.yaml) (`/campaigns`) |
| `campaignStore.ts`       | Pinia-Store: Liste laden, Kampagne erstellen, Lade- und Fehlerzustände              | dito                                                                                                                         |
| `campaignError.ts`       | Übersetzt Serverfehler in allgemeine und feldbezogene Formularmeldungen             | dito (`Error`, `InvalidCampaign`)                                                                                            |
| `idempotency.ts`         | Erzeugt den Idempotenzschlüssel pro Erstellversuch                                  | dito (Parameter `Idempotency-Key`)                                                                                           |
| `CreateCampaignForm.vue` | Formular für Seed und Zeitprofil inkl. Schlüssel-Lebenszyklus und Doppelklickschutz | dito                                                                                                                         |
| `CampaignListView.vue`   | Kampagnenliste, Erstelldialog und Weiterleitung zur Übersicht (`/campaigns`)        | dito                                                                                                                         |
| `CampaignView.vue`       | Minimale Kampagnenübersicht als Weiterleitungsziel; Zustand folgt in Issue #8       | dito (`/campaigns/{campaignId}`)                                                                                             |

## Idempotenz und Doppelabsenden

- Der Schlüssel gilt pro logischem Versuch: Eine Wiederholung derselben Daten verwendet denselben
  Schlüssel (Server liefert dieselbe Kampagne), geänderte Daten erzeugen einen neuen Schlüssel
  (kein Konflikt mit alten Daten).
- Zusätzlich sperrt der Ladezustand ein Doppelabsenden, sodass ein Doppelklick nur einen Request auslöst.

## Abhängigkeiten

- [`shared/api`](../../shared/api/README.md) für den REST-Client, `ApiError`/`UiError` und `toUiError`.
- [`shared/ui`](../../shared/ui/README.md) für `ErrorNotice`.
- `pinia` für den Store, `vue-router` für die Weiterleitung.

## Verdrahtung

`main.ts` bindet die `CampaignApi` über `useApi` an den Store. Die Routen `/campaigns`
(Liste/Erstellen) und `/campaigns/:campaignId` (Übersicht) tragen `meta.requiresAuth`; die
Hauptnavigation der App-Shell verlinkt die Kampagnen nur im angemeldeten Zustand.
