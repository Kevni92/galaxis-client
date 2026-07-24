<script setup lang="ts">
// Feature: GAL-AUTH-ACCOUNT-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")
import { onMounted, ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useAccountStore } from './accountStore'
import { useSessionStore } from './sessionStore'
import { extractAuthError, type AuthFormError } from './authError'
import CredentialsForm from './CredentialsForm.vue'

type Mode = 'login' | 'register'

const account = useAccountStore()
const session = useSessionStore()
const route = useRoute()
const router = useRouter()

const mode = ref<Mode>('register' in route.query ? 'register' : 'login')
const pending = ref(false)
const error = ref<AuthFormError | null>(null)
// Bestätigung nach erfolgreicher Registrierung, bevor sich der Nutzer anmeldet.
const notice = ref<string | null>(null)

/** Nur lokale Pfade zulassen, damit ein `redirect`-Parameter nicht auf fremde Ziele umleitet. */
function redirectTarget(): RouteLocationRaw {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return { name: 'home' }
}

function switchTo(next: Mode): void {
  mode.value = next
  error.value = null
  notice.value = null
}

async function onLogin(credentials: { email: string; password: string }): Promise<void> {
  if (pending.value) return
  pending.value = true
  error.value = null
  try {
    await account.login(credentials)
    await router.replace(redirectTarget())
  } catch (caught) {
    error.value = extractAuthError(caught)
  } finally {
    pending.value = false
  }
}

async function onRegister(credentials: { email: string; password: string }): Promise<void> {
  if (pending.value) return
  pending.value = true
  error.value = null
  notice.value = null
  try {
    await account.register(credentials)
    // Bewusst kein Auto-Login: Registrierung und Anmeldung bleiben getrennte, klare Schritte.
    mode.value = 'login'
    notice.value = 'Account erstellt. Bitte melde dich jetzt an.'
  } catch (caught) {
    error.value = extractAuthError(caught)
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  // Bereits angemeldete Nutzer gehören nicht auf die Anmeldemaske.
  if (session.isAuthenticated) void router.replace(redirectTarget())
})
</script>

<template>
  <section class="auth" data-testid="auth-view">
    <h1>{{ mode === 'login' ? 'Anmelden' : 'Registrieren' }}</h1>

    <div class="auth__tabs" role="tablist" aria-label="Anmelden oder Registrieren">
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'login'"
        class="auth__tab"
        data-testid="tab-login"
        @click="switchTo('login')"
      >
        Anmelden
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'register'"
        class="auth__tab"
        data-testid="tab-register"
        @click="switchTo('register')"
      >
        Registrieren
      </button>
    </div>

    <p v-if="notice" class="auth__notice" role="status" data-testid="form-notice">{{ notice }}</p>

    <CredentialsForm
      v-if="mode === 'login'"
      key="login"
      id-prefix="login"
      submit-label="Anmelden"
      password-autocomplete="current-password"
      :pending="pending"
      :error="error"
      @submit="onLogin"
    />
    <CredentialsForm
      v-else
      key="register"
      id-prefix="register"
      submit-label="Account erstellen"
      password-autocomplete="new-password"
      :pending="pending"
      :error="error"
      @submit="onRegister"
    />
  </section>
</template>

<style scoped>
.auth {
  max-width: 24rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth__tabs {
  display: flex;
  gap: 0.5rem;
}

.auth__tab {
  flex: 1;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.auth__tab[aria-selected='true'] {
  border-color: var(--color-accent, #4f7cff);
  font-weight: 600;
}

.auth__notice {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-accent, #4f7cff);
  border-radius: 0.35rem;
}
</style>
