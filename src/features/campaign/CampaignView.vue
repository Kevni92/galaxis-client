<script setup lang="ts">
// Feature: GAL-CAMPAIGN-CREATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns/{campaignId})
//
// Minimale Kampagnenübersicht als Weiterleitungsziel nach dem Erstellen. Der kompakte
// Kampagnenzustand und die Game-Shell-Navigation folgen in Issue #8 (GAL-API-A1-STATE-001).
import { useRoute } from 'vue-router'

const route = useRoute()
const campaignId = route.params.campaignId as string
</script>

<template>
  <section class="campaign" data-testid="campaign-view">
    <h1>Kampagne</h1>
    <p class="campaign__id" data-testid="campaign-view-id">
      Kampagne: <code>{{ campaignId }}</code>
    </p>
    <p class="campaign__hint">
      Der Kampagnenzustand wird hier geladen, sobald die Kampagnen-App-Shell verfügbar ist.
    </p>
    <RouterLink :to="{ name: 'campaigns' }" data-testid="back-to-campaigns"
      >Zurück zur Kampagnenliste</RouterLink
    >
  </section>
</template>

<style scoped>
.campaign {
  max-width: 48rem;
}

.campaign__id code {
  font-family: monospace;
}

.campaign__hint {
  opacity: 0.85;
}
</style>
