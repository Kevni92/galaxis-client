# Galaxis Client

Desktop-Webclient für **Galaxis**. Dieses Repository enthält ausschließlich den
Client. Der Server ist fachlich autoritativ; im Client werden keine Spielregeln
nachgebildet.

Feature-ID: `GAL-CLIENT-SHELL-001` · Umsetzung von Issue #1 (A0-App-Shell).

Maßgebliche Quellen: [`AGENTS.md`](AGENTS.md),
[Decision 0007](docs/decisions/0007-client-ui-rendering-und-lokalisierung.md),
[`docs/12-ui-ux/`](docs/docs/12-ui-ux/README.md),
[`docs/contracts/rest-api/galaxis-rest-v1.md`](docs/contracts/rest-api/galaxis-rest-v1.md).

## Technologie

TypeScript · Vue 3 (Composition API) · Vite · Vue Router · Pinia ·
Vitest & Vue Test Utils · Playwright. Bibliotheksversionen sind exakt gepinnt.

## Voraussetzungen

- Node.js ≥ 22 (getestet mit Node 26)
- [pnpm](https://pnpm.io/) (Version aus `packageManager` in `package.json`)

## Frischer Clone

Das Repository bindet die fachliche Dokumentation als Submodule unter `docs/` ein:

```bash
git clone https://github.com/Kevni92/galaxis-client.git
cd galaxis-client
git submodule update --init --recursive
pnpm install
```

## Lokale Befehle

| Zweck                                      | Befehl                              |
| ------------------------------------------ | ----------------------------------- |
| Entwicklungsserver (http://localhost:5173) | `pnpm dev`                          |
| Produktions-Build (`dist/`)                | `pnpm build`                        |
| Build lokal ausliefern                     | `pnpm preview`                      |
| Typprüfung                                 | `pnpm typecheck`                    |
| Linting                                    | `pnpm lint`                         |
| Formatierung prüfen / schreiben            | `pnpm format:check` / `pnpm format` |
| Unit-/Komponententests                     | `pnpm test:unit`                    |
| Playwright-Browser installieren (einmalig) | `pnpm test:e2e:install`             |
| End-to-End-Smoke (gemockte API)            | `pnpm test:e2e`                     |
| A0-End-to-End-Smoke (echter Server)        | `pnpm test:e2e:a0`                  |
| A1-End-to-End-Smoke (echter Server)        | `pnpm test:e2e:a1`                  |

## Konfiguration

Die API-Basis-URL ist konfigurierbar über `VITE_API_BASE_URL`
(siehe [`.env.example`](.env.example)):

```bash
cp .env.example .env
# VITE_API_BASE_URL leer lassen → server-relative Aufrufe (OpenAPI: servers "/")
# Der Vite-Devserver proxyt /health und /api standardmäßig nach
# http://127.0.0.1:3000; Ziel bei Bedarf über VITE_DEV_API_PROXY_TARGET ändern.
```

## Projektstruktur

Siehe [`src/README.md`](src/README.md) für die Modulnavigation. Kurz:

```text
src/
  main.ts            App-Bootstrap
  App.vue            Fehlergrenze + App-Shell
  app/               Shell, Routing, Fehlergrenze, Zustand
  shared/config/     konfigurierbare API-Basis-URL
  views/             Routenansichten
e2e/                 Playwright-Smoke-Tests (gemockte API)
e2e-a0/              A0-End-to-End-Smoke gegen echten Server
scripts/             Testorchestrierung (z. B. run-e2e-a0.mjs)
```

## Tests

Die Teststrategie folgt [`docs/TESTING.md`](docs/TESTING.md): schnelle Unit-/
Komponententests bei jeder Änderung, eine kleine kritische Playwright-Smoke-Suite
(nur Chromium, Desktop). `pnpm test:e2e` baut den Client, mockt die Auth-Endpunkte
und öffnet die App-Shell; er läuft bei jedem Pull Request in [CI](.github/workflows/ci.yml).

`pnpm test:e2e:a0` führt zusätzlich den vollständigen A0-Ablauf (Registrierung,
Anmeldung, Sessionprüfung, Abmeldung) gegen einen echten Server samt PostgreSQL
aus – gemäß `docs/TESTING.md` ("Nach Merge auf main") nicht bei jedem PR, sondern
nach dem Merge und manuell per `workflow_dispatch`. Voraussetzung ist ein
Nebeneinander-Checkout von [`galaxis-server`](https://github.com/Kevni92/galaxis-server)
unter `../server` (überschreibbar über `GALAXIS_SERVER_DIR`) sowie ein laufender
Docker-Daemon; das Skript [`scripts/run-e2e-a0.mjs`](scripts/run-e2e-a0.mjs) startet
PostgreSQL und den Server, wartet auf dessen Bereitschaft und führt
[`playwright.a0.config.ts`](playwright.a0.config.ts) aus.

`pnpm test:e2e:a1` führt den A1-Ablauf gegen denselben echten Server aus: Registrierung,
Anmeldung, Kampagnenerstellung, Heimatsystem, modales Heimatplanet-/Koloniedetail und
Reload-Wiederherstellung von Auswahl und Fensterzustand. Der Lauf verwendet
[`playwright.a1.config.ts`](playwright.a1.config.ts), einen separaten Preview-Port und
`test-results-a1/`; Voraussetzung sind ebenfalls ein benachbartes `galaxis-server` und Docker.

## Abgrenzung (A0)

Nicht enthalten: Gameplayansichten, vollständige Game Shell, finales Designsystem,
Three.js-Sternensystemszene, Desktopverpackung.
