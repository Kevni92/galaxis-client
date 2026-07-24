<script setup lang="ts">
// Feature: GAL-API-A1-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns/{campaignId}/state)
//
// Kampagnen-App-Shell: lädt nach Auswahl den kompakten Kampagnenzustand und stellt die Navigation
// zu Reich, System und Kolonie über die serverseitigen Linkrelationen bereit. Die bekannte
// 3D-Heimatsystemansicht (Issue #9) ist als permanente Arbeitsfläche eingebettet; das modale
// Kolonie-/Planetdetail (Issue #10) folgt.
import { defineAsyncComponent, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ErrorNotice } from '@/shared/ui'
import { useCampaignStateStore } from './campaignStateStore'

// Lazy-Import hält Three.js aus dem Startbundle; die Systemansicht lädt erst mit der Kampagne.
const HomeSystemView = defineAsyncComponent(() => import('@/features/galaxy/HomeSystemView.vue'))

const route = useRoute()
const store = useCampaignStateStore()
const { state, status, error, stateVersion, controlledEmpire, links } = storeToRefs(store)

function currentCampaignId(): string {
  return route.params.campaignId as string
}

onMounted(() => {
  void store.loadState(currentCampaignId())
})

// Deep-Link-Wechsel zwischen Kampagnen ohne Neumontage der Komponente berücksichtigen.
watch(
  () => route.params.campaignId,
  (id) => {
    if (typeof id === 'string') void store.loadState(id)
  },
)
</script>

<template>
  <section class="campaign" data-testid="campaign-view">
    <p v-if="status === 'loading'" data-testid="campaign-loading">Kampagne wird geladen …</p>

    <ErrorNotice
      v-else-if="status === 'error' && error"
      :error="error"
      retry="always"
      data-testid="campaign-error"
      @retry="store.reload()"
    />

    <template v-else-if="status === 'ready' && state">
      <header class="campaign__header">
        <h1>Kampagne</h1>
        <p class="campaign__id" data-testid="campaign-view-id">
          <code>{{ state.campaignId }}</code>
        </p>
      </header>

      <dl class="campaign__facts">
        <div>
          <dt>Status</dt>
          <dd data-testid="campaign-view-status">{{ state.status }}</dd>
        </div>
        <div>
          <dt>Zeitprofil</dt>
          <dd data-testid="campaign-view-time-profile">{{ state.timeProfile }}</dd>
        </div>
        <div>
          <dt>Kampagnenzeit (ms)</dt>
          <dd data-testid="campaign-view-time">{{ state.campaignTimeMs }}</dd>
        </div>
        <div>
          <dt>Zustandsversion</dt>
          <dd data-testid="campaign-view-state-version">{{ stateVersion }}</dd>
        </div>
        <div v-if="controlledEmpire">
          <dt>Kontrolliertes Reich</dt>
          <dd data-testid="campaign-view-empire">{{ controlledEmpire.name }}</dd>
        </div>
      </dl>

      <HomeSystemView
        v-if="links.galaxy"
        :galaxy-link="links.galaxy"
        data-testid="campaign-home-system"
      />

      <nav class="campaign__nav" aria-label="Kampagnennavigation" data-testid="campaign-nav">
        <h2>Reich</h2>
        <ul>
          <li v-if="links.colonies" data-testid="nav-colonies">Kolonien</li>
          <li v-if="links.population" data-testid="nav-population">Bevölkerung</li>
          <li v-if="links.economy" data-testid="nav-economy">Grundversorgung</li>
        </ul>
        <p class="campaign__hint">
          Die modalen Kolonie- und Planetdetails folgen im nächsten A1-Schritt.
        </p>
      </nav>
    </template>

    <RouterLink :to="{ name: 'campaigns' }" data-testid="back-to-campaigns"
      >Zurück zur Kampagnenliste</RouterLink
    >
  </section>
</template>

<style scoped>
.campaign {
  max-width: 48rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.campaign__id code {
  font-family: monospace;
}

.campaign__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.75rem 1.5rem;
  margin: 0;
}

.campaign__facts dt {
  font-size: 0.8rem;
  opacity: 0.75;
}

.campaign__facts dd {
  margin: 0;
  font-weight: 600;
}

.campaign__nav ul {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.campaign__hint {
  opacity: 0.85;
}
</style>
