# shared/ui – Wiederverwendbare UI-Bausteine

Fachlich neutrale, präsentationale Komponenten ohne Spiellogik. Feature-Module verwenden
diese Bausteine, statt Fehler- und Zustandsdarstellungen zu duplizieren.

| Datei             | Verantwortung                                                                                           | Fachliche Quelle                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ErrorNotice.vue` | Zeigt einen `UiError` mit Ursachen-Überschrift, kopierbarer Korrelations-ID und optionaler Wiederholung | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../../docs/contracts/rest-api/galaxis-rest-v1.md)                       |
| `ModalWindow.vue` | Wiederverwendbare modale Fensterhülle über der Raumansicht: Titelzeile, Inhalt, Aktionsbereich          | [`docs/decisions/0007-...md`](../../../docs/decisions/0007-client-ui-rendering-und-lokalisierung.md) (Game Shell/Fenster) |

## Abhängigkeiten

- `ErrorNotice.vue` nutzt den `UiError`-Typ aus [`../api`](../api/README.md).
- Die Komponente entscheidet nicht selbst über Wiederholbarkeit von Befehlen; der Aufrufer
  steuert die Wiederholung über die Eigenschaft `retry` (`auto` | `always` | `never`) und
  behandelt das `retry`-Ereignis.
- `ModalWindow.vue` ist fachlich neutral: Inhalt und Aktionen liefert der Aufrufer über die Slots
  (Standard-Slot und benannter `actions`-Slot). Das Fenster ist modal (`role="dialog"`,
  `aria-modal`), schließt per ESC und Overlay-Klick, hält den Fokus im Fenster und gibt ihn beim
  Schließen zurück. Es meldet den Schließwunsch über das `close`-Ereignis; der Aufrufer entfernt das
  Fenster.
