# features – Fachnahe Feature-Module

Klar abgegrenzte Feature-Module des Clients. Jedes Modul kapselt Zustand, Anbindung und
UI eines fachnahen Bereichs und nutzt die technischen Bausteine aus
[`shared/`](../shared/README.md). Der Server bleibt fachlich autoritativ.

| Modul                     | Verantwortung                                                      | Fachliche Quelle                                                                                 |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [`auth/`](auth/README.md) | Anmeldezustand, geschützte Routen und Registrierungs-/Anmeldemaske | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../docs/contracts/rest-api/galaxis-rest-v1.md) |
