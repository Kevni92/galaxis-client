# shared/ui – Wiederverwendbare UI-Bausteine

Fachlich neutrale, präsentationale Komponenten ohne Spiellogik. Feature-Module verwenden
diese Bausteine, statt Fehler- und Zustandsdarstellungen zu duplizieren.

| Datei             | Verantwortung                                                                                           | Fachliche Quelle                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `ErrorNotice.vue` | Zeigt einen `UiError` mit Ursachen-Überschrift, kopierbarer Korrelations-ID und optionaler Wiederholung | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../../docs/contracts/rest-api/galaxis-rest-v1.md) |

## Abhängigkeiten

- `ErrorNotice.vue` nutzt den `UiError`-Typ aus [`../api`](../api/README.md).
- Die Komponente entscheidet nicht selbst über Wiederholbarkeit von Befehlen; der Aufrufer
  steuert die Wiederholung über die Eigenschaft `retry` (`auto` | `always` | `never`) und
  behandelt das `retry`-Ereignis.
