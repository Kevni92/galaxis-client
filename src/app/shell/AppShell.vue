<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

/**
 * Minimale App-Shell als Grundgerüst der späteren Game Shell (Decision 0007).
 *
 * Liefert Topbar-Platzhalter, primäre Navigation und den Inhaltsbereich für Routen.
 * Noch ohne Raumansicht, Outliner, Fenstersystem oder Designsystem.
 */
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__topbar" data-testid="app-shell-topbar">
      <span class="app-shell__brand">Galaxis</span>
      <nav class="app-shell__nav" aria-label="Hauptnavigation">
        <RouterLink to="/">Start</RouterLink>
      </nav>
    </header>

    <main class="app-shell__main" data-testid="app-shell-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.app-shell__topbar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--color-border, #3a3f55);
}

.app-shell__brand {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.app-shell__nav {
  display: flex;
  gap: 1rem;
}

.app-shell__main {
  flex: 1;
  padding: 1.5rem 1.25rem;
}
</style>
