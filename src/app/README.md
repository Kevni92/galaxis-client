# app – Anwendungsrahmen

Rahmen der App-Shell: Layout, Navigation, Routing, globale Fehlerbehandlung und
anwendungsweiter Clientzustand. Grundlage für die spätere Game Shell (Decision 0007).

| Modul                        | Verantwortung                                                                       | Fachliche Quelle                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `shell/AppShell.vue`         | Minimale Shell mit Topbar-Platzhalter, Anmelde-/Abmeldesteuerung und Inhaltsbereich | [`docs/12-ui-ux/game-shell-und-fenstersystem.md`](../../docs/docs/12-ui-ux/game-shell-und-fenstersystem.md) |
| `error/AppErrorBoundary.vue` | Globale Fehlergrenze mit Ersatzdarstellung                                          | Decision 0007                                                                                               |
| `router/index.ts`            | Routendefinition inkl. geschützter Startseite, `/login` und Auffangroute            | –                                                                                                           |
| `stores/appStore.ts`         | Anwendungsweiter Clientzustand (Pinia)                                              | Decision 0007                                                                                               |

## Abhängigkeiten

- `vue-router` für Navigation, `pinia` für Zustand.
- `stores/appStore.ts` liest die aufgelöste Konfiguration aus [`../shared/config`](../shared/README.md).
