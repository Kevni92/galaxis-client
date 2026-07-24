# connection – Verbindungs- und Health-Zustand

Macht die technischen Zustände der Serververbindung sichtbar und unterscheidbar: Laden,
erreichbar, nicht erreichbar und unerwarteter Fehler. Eine nicht bestehende Anmeldung ist
bewusst kein Fall dieses Moduls, sondern Sache von [`auth/`](../auth/README.md). Der Server
bleibt fachlich autoritativ; Verbindungszustände werden ausschließlich aus den Health-Endpunkten
und dem einheitlichen `ApiError` abgeleitet.

| Datei                  | Verantwortung                                                                          | Fachliche Quelle                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `healthApi.ts`         | Anbindung an `/health/live` und `/health/ready`; löst den 503-Fall als `not_ready` auf | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../../docs/contracts/rest-api/galaxis-rest-v1.md) (Tag „Health") |
| `connectionStore.ts`   | Zentraler Verbindungszustand (`online`/`offline`/`error`) aus der Livenessprüfung      | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../../docs/contracts/rest-api/galaxis-rest-v1.md)                |
| `ConnectionBanner.vue` | Globaler Hinweis bei Serverausfall mit Korrelations-ID und manueller Wiederholung      | –                                                                                                                  |
| `HealthPanel.vue`      | Entwicklungsanzeige für Liveness und Readiness                                         | –                                                                                                                  |
| `healthInjection.ts`   | Bereitstellungsschlüssel der Health-API für die Entwicklungsanzeige                    | –                                                                                                                  |

## Abhängigkeiten

- Nutzt die zentrale REST-Schicht und die Fehlerabbildung aus [`../../shared/api`](../../shared/api/README.md).
- `ConnectionBanner.vue` stellt Fehler über [`../../shared/ui`](../../shared/ui/README.md) (`ErrorNotice`) dar.
- Die Livenessprüfung ist eine sichere Abfrage (GET) und darf über `withSafeRetry` begrenzt
  automatisch wiederholt werden; Befehle (POST) werden nie automatisch wiederholt.
