# features/auth – Anmeldezustand und geschützte Routen

Feature-ID: `GAL-AUTH-SESSION-001`

Zentraler Anmeldestatus des Clients. Eine Session gilt erst nach serverseitiger
Bestätigung als angemeldet; lokale Tokenexistenz allein ist keine Anmeldung. Das Modul
enthält keine Spielregeln – fachlicher Zustand bleibt beim Server.

| Datei             | Verantwortung                                                              | Fachliche Quelle                                                                                                        |
| ----------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `sessionStore.ts` | Pinia-Store mit Zuständen `unknown`/`anonymous`/`authenticated`/`error`    | [`docs/contracts/rest-api/galaxis-rest-v1.md`](../../../docs/contracts/rest-api/galaxis-rest-v1.md) (Authentifizierung) |
| `tokenStorage.ts` | Bearer-Token im Speicher, optional in `sessionStorage`                     | dito                                                                                                                    |
| `sessionApi.ts`   | Wrapper um die Session-Endpunkte (`GET`/`DELETE`) auf dem zentralen Client | dito                                                                                                                    |
| `routerGuard.ts`  | Navigations-Guard: öffnet `meta.requiresAuth`-Routen erst nach Bestätigung | dito                                                                                                                    |

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

## Verdrahtung

`main.ts` erzeugt den REST-Client mit `sessionProvider` des Stores, bindet die
`SessionApi` über `useApi`, registriert den Guard mit `router.beforeEach` und stößt
die Startprüfung über `ensureVerified()` an.
