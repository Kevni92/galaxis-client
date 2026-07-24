<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useSessionStore } from '@/features/auth'

/**
 * Minimale App-Shell als Grundgerüst der späteren Game Shell (Decision 0007).
 *
 * Liefert Topbar-Platzhalter, primäre Navigation und den Inhaltsbereich für Routen.
 * Noch ohne Raumansicht, Outliner, Fenstersystem oder Designsystem.
 */
const session = useSessionStore()
const router = useRouter()

async function onLogout(): Promise<void> {
  await session.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__topbar" data-testid="app-shell-topbar">
      <span class="app-shell__brand">Galaxis</span>
      <nav class="app-shell__nav" aria-label="Hauptnavigation">
        <RouterLink to="/">Start</RouterLink>
        <RouterLink v-if="session.isAuthenticated" :to="{ name: 'campaigns' }"
          >Kampagnen</RouterLink
        >
      </nav>
      <div class="app-shell__account">
        <template v-if="session.isAuthenticated">
          <span class="app-shell__email" data-testid="account-email">{{
            session.identity?.email
          }}</span>
          <button type="button" data-testid="logout-button" @click="onLogout">Abmelden</button>
        </template>
        <RouterLink v-else :to="{ name: 'login' }" data-testid="login-link">Anmelden</RouterLink>
      </div>
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

.app-shell__account {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.app-shell__email {
  opacity: 0.85;
}

.app-shell__main {
  flex: 1;
  padding: 1.5rem 1.25rem;
}
</style>
