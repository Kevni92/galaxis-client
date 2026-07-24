# features – Fachnahe Feature-Module

Klar abgegrenzte Feature-Module des Clients. Jedes Modul kapselt Zustand, Anbindung und
UI eines fachnahen Bereichs und nutzt die technischen Bausteine aus
[`shared/`](../shared/README.md). Der Server bleibt fachlich autoritativ.

| Modul                                 | Verantwortung                                                            | Fachliche Quelle                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [`auth/`](auth/README.md)             | Anmeldezustand, geschützte Routen und Registrierungs-/Anmeldemaske       | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../docs/contracts/rest-api/galaxis-rest-v1.md)           |
| [`connection/`](connection/README.md) | Verbindungs- und Health-Zustand: Laden, erreichbar, offline, Fehler      | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../docs/contracts/rest-api/galaxis-rest-v1.md)           |
| [`campaign/`](campaign/README.md)     | Kampagnenliste, Erstellung und Kampagnen-App-Shell mit Zustandsbootstrap | [`docs/contracts/rest-api/galaxis-rest-v1-a1.yaml`](../../docs/contracts/rest-api/galaxis-rest-v1-a1.yaml) |
| [`galaxy/`](galaxy/README.md)         | Bekannte 3D-Heimatsystemansicht mit Auswahl und zugänglicher Objektliste | [`docs/contracts/rest-api/galaxis-rest-v1-a1.yaml`](../../docs/contracts/rest-api/galaxis-rest-v1-a1.yaml) |
