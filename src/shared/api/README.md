# api – Zentrale REST-Schicht

Feature: `GAL-API-CORE-001`. Einzige Stelle, an der der Client HTTP-Anfragen an die
Galaxis-REST-API stellt. Komponenten und Stores rufen niemals `fetch` direkt auf,
sondern verwenden den hier bereitgestellten Client. Der Server bleibt fachlich
autoritativ; diese Schicht bildet keine Spielregeln nach.

Maßgebliche Quelle: [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../../docs/contracts/rest-api/galaxis-rest-v1.md).

## Struktur

| Datei/Modul      | Verantwortung                                                                                                           | Fachliche Quelle                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `restClient.ts`  | Zentrale Fetch-Abstraktion: Header, Timeout, Abbruch, Fehlerübersetzung; `getDetailed` liefert zusätzlich `ETag`/Status | `galaxis-rest-v1.md` (Anforderungen an Client)     |
| `apiError.ts`    | Übersetzt Vertrags-Fehlerformat und Transportfehler in `ApiError` / `UiError`                                           | `galaxis-rest-v1.md` (Fehlerformat, Statuscodes)   |
| `retry.ts`       | Wiederholt nur sichere Abfragen (GET); Befehle werden nie automatisch dupliziert                                        | `galaxis-rest-v1.md` (Anforderungen an Client)     |
| `session.ts`     | `SessionProvider` für den Bearer-Header (Quelle austauschbar)                                                           | `galaxis-rest-v1.md` (Authentifizierung)           |
| `correlation.ts` | Erzeugt Request-Korrelationskennungen                                                                                   | `galaxis-rest-v1.md` (correlationId)               |
| `contract.ts`    | Kanonische Re-Exports der generierten Vertragstypen                                                                     | `galaxis-rest-v1.yaml` + `galaxis-rest-v1-a1.yaml` |
| `generated/`     | Aus OpenAPI generierte Typen (nicht manuell bearbeiten)                                                                 | siehe [`generated/README.md`](generated/README.md) |
| `index.ts`       | Öffentliche Schnittstelle der Schicht                                                                                   | –                                                  |

## Verwendung

```ts
import { createRestClient, isApiError } from '@/shared/api'

const client = createRestClient({ session: mySessionProvider })
try {
  const campaigns = await client.get('/api/v1/campaigns')
} catch (err) {
  if (isApiError(err)) showToast(err.message) // err.code ist stabil, err.message lokalisierbar
}
```

Der Client kombiniert ein externes `AbortSignal` mit einem Standard-Timeout, setzt den
Korrelations- und Bearer-Header und übersetzt jede Fehlerantwort zentral in `ApiError`.

## Typgenerierung

Die Vertragstypen werden aus beiden OpenAPI-Dateien generiert:

```bash
pnpm gen:api
```

Beide Dateien bilden gemeinsam die API-Hauptversion `v1`. Nach einer Vertragsänderung
im Docs-Submodule wird `pnpm gen:api` erneut ausgeführt; Abweichungen werden dadurch in
der Typprüfung sichtbar.
