# generated – Aus OpenAPI erzeugte Vertragstypen

Diese Dateien werden mit `openapi-typescript` aus den freigegebenen OpenAPI-Verträgen
erzeugt und **nicht manuell bearbeitet**. Sie sind von Linting und Formatierung
ausgenommen, werden aber durch die Typprüfung (`vue-tsc`) erfasst.

| Datei                   | Quelle im Docs-Submodule                                    |
| ----------------------- | ----------------------------------------------------------- |
| `galaxis-rest-v1.ts`    | `docs/contracts/rest-api/galaxis-rest-v1.yaml` (A0)         |
| `galaxis-rest-v1-a1.ts` | `docs/contracts/rest-api/galaxis-rest-v1-a1.yaml` (A1)      |

Neu erzeugen nach einer Vertragsänderung:

```bash
pnpm gen:api
```

Kanonische, für den Client bequeme Re-Exports stehen in [`../contract.ts`](../contract.ts).
