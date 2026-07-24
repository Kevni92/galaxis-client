<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

/**
 * Globale Fehlergrenze der App-Shell.
 *
 * Fängt Fehler aus untergeordneten Komponenten ab und zeigt eine verständliche
 * Ersatzdarstellung statt einer leeren Seite. Der Server bleibt maßgeblich; hier
 * wird nur die Client-Darstellung robust gehalten.
 */
const error = ref<Error | null>(null)

onErrorCaptured((caught: unknown) => {
  error.value = caught instanceof Error ? caught : new Error(String(caught))
  // Fehler nicht weiter nach oben propagieren – die Grenze übernimmt die Darstellung.
  return false
})

function reset(): void {
  error.value = null
}
</script>

<template>
  <div v-if="error" class="error-boundary" role="alert" data-testid="error-boundary">
    <h2>Es ist ein Fehler aufgetreten.</h2>
    <p>Die Ansicht konnte nicht vollständig geladen werden.</p>
    <button type="button" @click="reset">Erneut versuchen</button>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  margin: 2rem auto;
  max-width: 32rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.5rem;
  text-align: center;
}

.error-boundary button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
