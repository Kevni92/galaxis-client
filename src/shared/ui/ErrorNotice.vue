<script setup lang="ts">
// Feature: GAL-CLIENT-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Abschnitte "Fehlerformat", correlationId)
import { computed, ref } from 'vue'
import type { UiError } from '@/shared/api'

const props = withDefaults(
  defineProps<{
    /** Aufbereiteter Fehler aus der REST-Schicht; `message` und `code` stammen vom Server. */
    error: UiError
    /**
     * Steuert die Wiederholungsschaltfläche: `auto` folgt `error.retryable`, `always` erzwingt sie
     * (z. B. für eine sichere GET-Abfrage), `never` unterdrückt sie (z. B. für Befehle/POST).
     */
    retry?: 'auto' | 'always' | 'never'
    /** True, während eine ausgelöste Wiederholung läuft; sperrt die Schaltfläche. */
    busy?: boolean
  }>(),
  { retry: 'auto', busy: false },
)

const emit = defineEmits<{ retry: [] }>()

const showRetry = computed(() => {
  if (props.retry === 'always') return true
  if (props.retry === 'never') return false
  return props.error.retryable
})

/** Überschrift nach Fehlerursache, damit Serverausfall und fachlicher Fehler unterscheidbar sind. */
const title = computed(() => {
  switch (props.error.kind) {
    case 'network':
    case 'timeout':
      return 'Server nicht erreichbar'
    case 'aborted':
      return 'Anfrage abgebrochen'
    default:
      return 'Es ist ein Fehler aufgetreten'
  }
})

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

// Korrelations-ID kopierbar machen, damit sie im Supportfall verlustfrei weitergegeben werden kann.
async function copyCorrelationId(): Promise<void> {
  const id = props.error.correlationId
  if (!id) return
  try {
    await navigator.clipboard?.writeText(id)
    copied.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Kopieren kann in eingeschränkten Umgebungen scheitern; die ID bleibt sichtbar lesbar.
    copied.value = false
  }
}
</script>

<template>
  <div class="error-notice" role="alert" data-testid="error-notice" :data-kind="error.kind">
    <p class="error-notice__title" data-testid="error-title">{{ title }}</p>
    <p class="error-notice__message" data-testid="error-message">{{ error.message }}</p>

    <p v-if="error.correlationId" class="error-notice__correlation">
      <span class="error-notice__label">Korrelations-ID:</span>
      <code data-testid="correlation-id">{{ error.correlationId }}</code>
      <button
        type="button"
        class="error-notice__copy"
        data-testid="copy-correlation-id"
        @click="copyCorrelationId"
      >
        {{ copied ? 'Kopiert' : 'Kopieren' }}
      </button>
    </p>

    <button
      v-if="showRetry"
      type="button"
      class="error-notice__retry"
      data-testid="retry-button"
      :disabled="busy"
      :aria-busy="busy ? 'true' : undefined"
      @click="emit('retry')"
    >
      {{ busy ? 'Wird erneut versucht …' : 'Erneut versuchen' }}
    </button>
  </div>
</template>

<style scoped>
.error-notice {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-danger, #e5484d);
  border-radius: 0.5rem;
}

.error-notice__title {
  margin: 0;
  font-weight: 600;
}

.error-notice__message {
  margin: 0;
}

.error-notice__correlation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.error-notice__label {
  opacity: 0.85;
}

.error-notice__correlation code {
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  background: var(--color-surface-muted, rgba(127, 127, 127, 0.15));
}

.error-notice__copy,
.error-notice__retry {
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.error-notice__retry {
  align-self: flex-start;
}

.error-notice__retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
