# src – Quellcodeübersicht

Desktop-Webclient von Galaxis. Die App-Shell (A0) bildet die technische Grundlage
für spätere Game Shell, Lokalisierung und UI-Foundation. Der Server bleibt fachlich
autoritativ; hier werden keine Spielregeln modelliert.

Maßgebliche Quellen: [Decision 0007](../docs/decisions/0007-client-ui-rendering-und-lokalisierung.md),
[`docs/12-ui-ux/`](../docs/docs/12-ui-ux/README.md).

## Struktur

| Modul                         | Verantwortung                                                         | Fachliche Quelle                             |
| ----------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `main.ts`                     | Bootstrap: Pinia, Router, globaler Fehler-Handler, Mount              | Decision 0007                                |
| `App.vue`                     | Wurzelkomponente: Fehlergrenze umschließt die App-Shell               | Decision 0007                                |
| [`app/`](app/README.md)       | Shell, Routing, Fehlergrenze und anwendungsweiter Zustand             | Decision 0007, `docs/12-ui-ux/`              |
| [`shared/`](shared/README.md) | Technische Querschnittsbausteine, u. a. konfigurierbare API-Basis-URL | `docs/contracts/rest-api/galaxis-rest-v1.md` |
| `views/`                      | Routenansichten (Start, Auffangansicht)                               | –                                            |
| `assets/`                     | Minimale technische Basis-Styles (kein finales Designsystem)          | Decision 0007                                |

## Geplante Erweiterungen (noch nicht Teil von A0)

- Session-Store und geschützte Routen (`galaxis-client#3`).
- Gekapselte Three.js-Rendering-Schicht, Fenstersystem und Outliner.
- Lokalisierungs- und Begriffskatalogschicht (Decision 0007).
