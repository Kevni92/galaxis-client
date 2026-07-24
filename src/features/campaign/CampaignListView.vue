<script setup lang="ts">
// Feature: GAL-CAMPAIGN-CREATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns)
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ErrorNotice } from '@/shared/ui'
import { useCampaignStore } from './campaignStore'
import type { CreateCampaignRequest } from './campaignApi'
import { extractCampaignError } from './campaignError'
import CreateCampaignForm from './CreateCampaignForm.vue'

const router = useRouter()
const store = useCampaignStore()
const { campaigns, listStatus, listError, createPending, createError } = storeToRefs(store)

// Serverfehler des Erstellens für das Formular aufbereiten; der Server bleibt maßgeblich.
const formError = computed(() =>
  createError.value ? extractCampaignError(createError.value) : null,
)

onMounted(() => {
  void store.load()
})

async function onCreate(payload: {
  request: CreateCampaignRequest
  idempotencyKey: string
}): Promise<void> {
  try {
    const created = await store.create(payload.request, payload.idempotencyKey)
    // Weiterleitung zur Kampagnenübersicht; der kompakte Zustand wird dort geladen (Issue #8).
    await router.push({ name: 'campaign', params: { campaignId: created.campaignId } })
  } catch {
    // Fehler bleibt über den Store im Formular sichtbar; kein zusätzliches Verhalten nötig.
  }
}
</script>

<template>
  <section class="campaigns" data-testid="campaign-list-view">
    <header class="campaigns__header">
      <h1>Kampagnen</h1>
      <p>Bestehende Singleplayer-Kampagnen öffnen oder eine neue A1-Kampagne starten.</p>
    </header>

    <div class="campaigns__body">
      <div class="campaigns__list" aria-labelledby="campaigns-list-heading">
        <h2 id="campaigns-list-heading">Eigene Kampagnen</h2>

        <p v-if="listStatus === 'loading'" data-testid="list-loading">Kampagnen werden geladen …</p>

        <ErrorNotice
          v-else-if="listStatus === 'error' && listError"
          :error="listError"
          retry="always"
          data-testid="list-error"
          @retry="store.load()"
        />

        <p v-else-if="campaigns.length === 0" data-testid="list-empty">
          Noch keine Kampagne vorhanden. Starte rechts deine erste Kampagne.
        </p>

        <ul v-else class="campaigns__items" data-testid="campaign-items">
          <li v-for="campaign in campaigns" :key="campaign.campaignId" class="campaigns__item">
            <RouterLink
              class="campaigns__link"
              :to="{ name: 'campaign', params: { campaignId: campaign.campaignId } }"
              :data-testid="`campaign-link-${campaign.campaignId}`"
            >
              <span class="campaigns__id">{{ campaign.campaignId }}</span>
              <span class="campaigns__meta">
                <span class="campaigns__status" data-testid="campaign-status">{{
                  campaign.status
                }}</span>
                <span class="campaigns__time-profile" data-testid="campaign-time-profile">{{
                  campaign.timeProfile
                }}</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <div class="campaigns__create">
        <h2>Neue Kampagne</h2>
        <CreateCampaignForm :pending="createPending" :error="formError" @submit="onCreate" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.campaigns {
  max-width: 60rem;
}

.campaigns__header p {
  opacity: 0.85;
}

.campaigns__body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-top: 1.5rem;
}

@media (max-width: 48rem) {
  .campaigns__body {
    grid-template-columns: 1fr;
  }
}

.campaigns__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.campaigns__link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.4rem;
  color: inherit;
  text-decoration: none;
}

.campaigns__link:hover,
.campaigns__link:focus-visible {
  border-color: var(--color-accent, #4f7cff);
}

.campaigns__id {
  font-family: monospace;
}

.campaigns__meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.campaigns__status,
.campaigns__time-profile {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--color-surface-muted, rgba(127, 127, 127, 0.15));
  font-size: 0.8rem;
}
</style>
