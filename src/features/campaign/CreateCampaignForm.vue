<script setup lang="ts">
// Feature: GAL-CAMPAIGN-CREATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns, Parameter Idempotency-Key)
import { computed, ref, watch } from 'vue'
import type { CreateCampaignRequest } from './campaignApi'
import type { CampaignFormError } from './campaignError'
import { createIdempotencyKey } from './idempotency'

const props = defineProps<{
  /** True, während ein Erstellen-Request läuft; sperrt Felder und verhindert einen Doppel-Request. */
  pending: boolean
  /** Serverseitige Fehler; `null`, wenn kein Fehler ansteht. */
  error: CampaignFormError | null
}>()

const emit = defineEmits<{
  submit: [payload: { request: CreateCampaignRequest; idempotencyKey: string }]
}>()

const MAX_SAFE_SEED = Number.MAX_SAFE_INTEGER

function randomSeed(): number {
  return Math.floor(Math.random() * (MAX_SAFE_SEED + 1))
}

const seed = ref<number>(randomSeed())
const timeProfile = ref('standard')

// Der Idempotenzschlüssel gilt pro fachlichem Versuch: Er bleibt für eine Wiederholung derselben
// Daten stabil und wird bei geänderten Eingaben verworfen, damit kein Konflikt mit alten Daten entsteht.
let idempotencyKey: string | null = null
watch([seed, timeProfile], () => {
  idempotencyKey = null
})

const seedError = computed(() => props.error?.fieldErrors.seed)
const timeProfileError = computed(() => props.error?.fieldErrors.timeProfile)

const seedValid = computed(
  () => Number.isInteger(seed.value) && seed.value >= 0 && seed.value <= MAX_SAFE_SEED,
)

const canSubmit = computed(
  () => !props.pending && seedValid.value && timeProfile.value.trim().length > 0,
)

function fillRandomSeed(): void {
  seed.value = randomSeed()
}

function onSubmit(): void {
  if (!canSubmit.value) return
  if (!idempotencyKey) idempotencyKey = createIdempotencyKey()
  emit('submit', {
    request: { seed: seed.value, timeProfile: timeProfile.value.trim() },
    idempotencyKey,
  })
}
</script>

<template>
  <form class="create-campaign" novalidate @submit.prevent="onSubmit">
    <p
      v-if="error"
      id="create-campaign-error"
      class="create-campaign__error"
      role="alert"
      data-testid="create-error"
    >
      {{ error.message }}
    </p>

    <div class="create-campaign__field">
      <label for="create-campaign-seed">Seed</label>
      <div class="create-campaign__seed">
        <input
          id="create-campaign-seed"
          v-model.number="seed"
          type="number"
          name="seed"
          min="0"
          step="1"
          :max="MAX_SAFE_SEED"
          required
          :disabled="pending"
          :aria-invalid="seedError ? 'true' : undefined"
          :aria-describedby="seedError ? 'create-campaign-seed-error' : undefined"
          data-testid="seed-input"
        />
        <button
          type="button"
          class="create-campaign__seed-random"
          :disabled="pending"
          data-testid="random-seed-button"
          @click="fillRandomSeed"
        >
          Zufällig
        </button>
      </div>
      <span
        v-if="seedError"
        id="create-campaign-seed-error"
        class="create-campaign__field-error"
        role="alert"
      >
        {{ seedError }}
      </span>
    </div>

    <div class="create-campaign__field">
      <label for="create-campaign-time-profile">Zeitprofil</label>
      <input
        id="create-campaign-time-profile"
        v-model="timeProfile"
        type="text"
        name="timeProfile"
        required
        :disabled="pending"
        :aria-invalid="timeProfileError ? 'true' : undefined"
        :aria-describedby="timeProfileError ? 'create-campaign-time-profile-error' : undefined"
        data-testid="time-profile-input"
      />
      <span
        v-if="timeProfileError"
        id="create-campaign-time-profile-error"
        class="create-campaign__field-error"
        role="alert"
      >
        {{ timeProfileError }}
      </span>
    </div>

    <button
      type="submit"
      class="create-campaign__submit"
      :disabled="!canSubmit"
      :aria-busy="pending ? 'true' : undefined"
      data-testid="create-submit"
    >
      {{ pending ? 'Kampagne wird erstellt …' : 'Kampagne starten' }}
    </button>
  </form>
</template>

<style scoped>
.create-campaign {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-campaign__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.create-campaign__seed {
  display: flex;
  gap: 0.5rem;
}

.create-campaign__seed input {
  flex: 1;
}

.create-campaign__field input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
}

.create-campaign__field input[aria-invalid='true'] {
  border-color: var(--color-danger, #e5484d);
}

.create-campaign__seed-random {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.create-campaign__error {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-danger, #e5484d);
  border-radius: 0.35rem;
  color: var(--color-danger, #e5484d);
}

.create-campaign__field-error {
  color: var(--color-danger, #e5484d);
  font-size: 0.85rem;
}

.create-campaign__submit {
  padding: 0.55rem 1rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: var(--color-accent, #4f7cff);
  color: #fff;
  cursor: pointer;
}

.create-campaign__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
