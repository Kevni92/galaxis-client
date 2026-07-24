<script setup lang="ts">
// Feature: GAL-AUTH-ACCOUNT-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitt "Authentifizierung")
import { computed, ref } from 'vue'
import type { AuthFormError } from './authError'

const props = defineProps<{
  /** Eindeutiges Präfix für Feld- und Fehler-IDs, damit mehrere Masken kollisionsfrei bleiben. */
  idPrefix: string
  /** Beschriftung der Absende-Schaltfläche. */
  submitLabel: string
  /** True, während ein Request läuft; sperrt Felder und verhindert einen Doppel-Request. */
  pending: boolean
  /** Serverseitige Fehler; `null`, wenn kein Fehler ansteht. */
  error: AuthFormError | null
  /** `current-password` bei Anmeldung, `new-password` bei Registrierung. */
  passwordAutocomplete: 'current-password' | 'new-password'
}>()

const emit = defineEmits<{
  submit: [credentials: { email: string; password: string }]
}>()

const email = ref('')
const password = ref('')

const emailId = computed(() => `${props.idPrefix}-email`)
const passwordId = computed(() => `${props.idPrefix}-password`)
const generalErrorId = computed(() => `${props.idPrefix}-error`)
const emailErrorId = computed(() => `${props.idPrefix}-email-error`)
const passwordErrorId = computed(() => `${props.idPrefix}-password-error`)

const emailError = computed(() => props.error?.fieldErrors.email)
const passwordError = computed(() => props.error?.fieldErrors.password)

// Leere Pflichtfelder sperren das Absenden, damit kein sinnloser Request entsteht.
const canSubmit = computed(
  () => !props.pending && email.value.trim().length > 0 && password.value.length > 0,
)

function onSubmit(): void {
  if (!canSubmit.value) return
  emit('submit', { email: email.value.trim(), password: password.value })
}
</script>

<template>
  <form class="credentials-form" novalidate @submit.prevent="onSubmit">
    <p
      v-if="error"
      :id="generalErrorId"
      class="credentials-form__error"
      role="alert"
      data-testid="form-error"
    >
      {{ error.message }}
    </p>

    <div class="credentials-form__field">
      <label :for="emailId">E-Mail-Adresse</label>
      <input
        :id="emailId"
        v-model="email"
        type="email"
        name="email"
        autocomplete="email"
        required
        :disabled="pending"
        :aria-invalid="emailError ? 'true' : undefined"
        :aria-describedby="emailError ? emailErrorId : undefined"
        data-testid="email-input"
      />
      <span v-if="emailError" :id="emailErrorId" class="credentials-form__field-error" role="alert">
        {{ emailError }}
      </span>
    </div>

    <div class="credentials-form__field">
      <label :for="passwordId">Passwort</label>
      <input
        :id="passwordId"
        v-model="password"
        type="password"
        name="password"
        :autocomplete="passwordAutocomplete"
        required
        :disabled="pending"
        :aria-invalid="passwordError ? 'true' : undefined"
        :aria-describedby="passwordError ? passwordErrorId : undefined"
        data-testid="password-input"
      />
      <span
        v-if="passwordError"
        :id="passwordErrorId"
        class="credentials-form__field-error"
        role="alert"
      >
        {{ passwordError }}
      </span>
    </div>

    <button
      type="submit"
      class="credentials-form__submit"
      :disabled="!canSubmit"
      :aria-busy="pending ? 'true' : undefined"
      data-testid="submit-button"
    >
      {{ pending ? 'Bitte warten …' : submitLabel }}
    </button>
  </form>
</template>

<style scoped>
.credentials-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.credentials-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.credentials-form__field input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
}

.credentials-form__field input[aria-invalid='true'] {
  border-color: var(--color-danger, #e5484d);
}

.credentials-form__error {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-danger, #e5484d);
  border-radius: 0.35rem;
  color: var(--color-danger, #e5484d);
}

.credentials-form__field-error {
  color: var(--color-danger, #e5484d);
  font-size: 0.85rem;
}

.credentials-form__submit {
  padding: 0.55rem 1rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: var(--color-accent, #4f7cff);
  color: #fff;
  cursor: pointer;
}

.credentials-form__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
