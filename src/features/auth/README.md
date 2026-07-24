# features/auth – Anmeldezustand, Anmeldemaske und geschützte Routen

Feature-IDs: `GAL-AUTH-SESSION-001` (Anmeldezustand, Guards), `GAL-AUTH-ACCOUNT-001` (Registrierungs- und Anmeldemaske)

Zentraler Anmeldestatus des Clients und die Masken für Registrierung und Anmeldung. Eine
Session gilt erst nach serverseitiger Bestätigung als angemeldet; lokale Tokenexistenz allein
ist keine Anmeldung. Zugangsdaten laufen ausschließlich über die Vertragsendpunkte; Passwörter
werden nicht geloggt oder dauerhaft gespeichert. Das Modul enthält keine Spielregeln – fachlicher
Zustand bleibt beim Server.

| Datei                 | Verantwortung                                                                          | Fachliche Quelle                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `sessionStore.ts`     | Pinia-Store mit Zuständen `unknown`/`anonymous`/`authenticated`/`error`                | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../../docs/contracts/rest-api/galaxis-rest-v1.md) (Authentifizierung) |
| `tokenStorage.ts`     | Bearer-Token im Speicher, optional in `sessionStorage`                                 | dito                                                                                                                    |
| `sessionApi.ts`       | Wrapper um die Session-Endpunkte (`GET`/`DELETE`) auf dem zentralen Client             | dito                                                                                                                    |
| `routerGuard.ts`      | Navigations-Guard: öffnet `meta.requiresAuth`-Routen erst nach Bestätigung             | dito                                                                                                                    |
| `accountApi.ts`       | Wrapper um Registrierung (`POST /auth/accounts`) und Anmeldung (`POST /auth/sessions`) | dito                                                                                                                    |
| `accountStore.ts`     | Pinia-Store: registriert bzw. meldet an und übergibt die Session an `sessionStore`     | dito                                                                                                                    |
| `authError.ts`        | Übersetzt Serverfehler generisch in allgemeine und feldbezogene Meldungen              | dito                                                                                                                    |
| `CredentialsForm.vue` | Wiederverwendbares Feldpaar E-Mail/Passwort mit Lade-, Disabled- und Fehlerzuständen   | dito                                                                                                                    |
| `AuthView.vue`        | Anmelde-/Registriermaske (`/login`) inkl. sicherer Weiterleitung nach Erfolg           | dito                                                                                                                    |

## Zustandsübergänge

- `unknown` → Startzustand, auch bei vorhandenem Token, bis die Serverprüfung greift.
- `verify()` ohne Token → `anonymous` (kein Serveraufruf).
- `verify()` mit Token, Server bestätigt → `authenticated`.
- `401` bei Prüfung oder `handleUnauthorized()` → kontrollierter Reset auf `anonymous`, Token verworfen.
- transienter Fehler (Netzwerk, `500`) → `error`, Token bleibt für eine spätere Prüfung erhalten.
- `logout()` → serverseitige Abmeldung und lokaler Reset auf `anonymous`, auch bei Serverfehler.

## Abhängigkeiten

- [`shared/api`](../../shared/api/README.md) für den REST-Client, `SessionProvider` und `ApiError`.
- `pinia` für den Store, `vue-router` für den Guard.

## Anmeldeablauf

- Registrieren und Anmelden sind bewusst getrennte Schritte: Nach erfolgreicher Registrierung
  wechselt `AuthView` in den Anmeldemodus und meldet nicht automatisch an.
- Eine erfolgreiche Anmeldung übergibt die Session an `sessionStore.adoptSession` und leitet auf
  das `redirect`-Ziel weiter; nur lokale Pfade (`/…`, kein `//`) werden akzeptiert.
- Doppelte Absendungen werden über den Ladezustand gesperrt (Store-seitig und im Formular).

## Verdrahtung

`main.ts` erzeugt den REST-Client mit `sessionProvider` des Stores, bindet die `SessionApi`
und `AccountApi` über `useApi`, registriert den Guard mit `router.beforeEach` (Umleitung auf
`login`) und stößt die Startprüfung über `ensureVerified()` an. Die geschützte Startseite `/`
trägt `meta.requiresAuth`; die Maske liegt öffentlich unter `/login`.
