# shared – Technische Querschnittsbausteine

Wiederverwendbare, fachlich neutrale Bausteine ohne Spiellogik.

| Modul                 | Verantwortung                                                       | Fachliche Quelle                                                                                 |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `config/appConfig.ts` | Auflösung der konfigurierbaren API-Basis-URL und Request-URL-Aufbau | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../docs/contracts/rest-api/galaxis-rest-v1.md) |

## Konfiguration

Die API-Basis-URL wird über die Vite-Umgebungsvariable `VITE_API_BASE_URL` gesetzt
(siehe [`.env.example`](../../.env.example)). Ein leerer Wert bedeutet server-relative
Aufrufe gemäß OpenAPI-Vertrag (`servers: "/"`).
