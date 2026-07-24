<script setup lang="ts">
// Feature: GAL-CLIENT-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Tag "Health", Abschnitt "Fehlerformat")
import { computed } from 'vue'
import { ErrorNotice } from '@/shared/ui'
import { useConnectionStore } from './connectionStore'

/**
 * Globaler Verbindungshinweis. Wird nur bei nicht erreichbarem Server oder unerwartetem
 * Prüffehler sichtbar und bietet eine manuelle Wiederholung der sicheren Livenessabfrage an.
 * Eine nicht bestehende Anmeldung ist bewusst kein Fall dieses Banners.
 */
const store = useConnectionStore()

// Sichtbar, solange ein Verbindungsfehler ansteht und die Verbindung nicht bestätigt ist.
const visible = computed(() => store.lastError !== null && !store.isOnline)

function onRetry(): void {
  void store.check()
}
</script>

<template>
  <div v-if="visible" class="connection-banner" data-testid="connection-banner">
    <ErrorNotice
      v-if="store.lastError"
      :error="store.lastError"
      retry="always"
      :busy="store.isChecking"
      @retry="onRetry"
    />
  </div>
</template>

<style scoped>
.connection-banner {
  padding: 0.75rem 1.25rem;
}
</style>
