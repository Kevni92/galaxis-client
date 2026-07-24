<script setup lang="ts">
// Feature: GAL-CLIENT-A1-NAV-001
// Feature: GAL-API-A1-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (Pfad /api/v1/campaigns/{campaignId}/state)
//
// Kampagnen-App-Shell: lädt nach Auswahl den kompakten Kampagnenzustand und stellt die Navigation
// zu Reich, System und Kolonie über die serverseitigen Linkrelationen bereit. Die bekannte
// 3D-Heimatsystemansicht (Issue #9) ist als permanente Arbeitsfläche eingebettet; die Shell öffnet
// beim Auswählen eines Planeten das modale Kolonie-/Planetdetail (Issue #10) über der Szene.
import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ErrorNotice } from '@/shared/ui'
import { useHomeSystemStore } from '@/features/galaxy'
import { ColonyDetailWindow, useColonyStore } from '@/features/colony'
import { useCampaignStateStore } from './campaignStateStore'
import { detailQuery, isDetailTab, isDetailWindow, type DetailTabId } from './campaignNavigation'

// Lazy-Import hält Three.js aus dem Startbundle; die Systemansicht lädt erst mit der Kampagne.
const HomeSystemView = defineAsyncComponent(() => import('@/features/galaxy/HomeSystemView.vue'))

const route = useRoute()
const router = useRouter()
const store = useCampaignStateStore()
const { state, status, error, stateVersion, controlledEmpire, links } = storeToRefs(store)

const homeSystem = useHomeSystemStore()
const colony = useColonyStore()
const { selectedObject, status: homeSystemStatus, system: homeSystemData } = storeToRefs(homeSystem)

/** Das modale Detailfenster öffnet, solange ein Planet gewählt ist; die Szene bleibt im Hintergrund. */
const selectedPlanet = computed(() =>
  selectedObject.value?.kind === 'planet' ? selectedObject.value : null,
)

const detailWindow = computed(() =>
  isDetailWindow(route.query.window) ? route.query.window : null,
)
const rawDetailWindow = computed(() => route.query.window)
const rawDetailTab = computed(() => route.query.tab)
const detailTab = computed<DetailTabId>(() =>
  isDetailTab(route.query.tab) ? route.query.tab : 'overview',
)

function currentCampaignId(): string {
  return route.params.campaignId as string
}

function currentSystemId(): string | undefined {
  return typeof route.params.systemId === 'string' ? route.params.systemId : undefined
}

function replaceQuery(query: LocationQueryRaw): void {
  void router.replace({ query })
}

function queryWithoutDetail(): LocationQueryRaw {
  const query = { ...route.query }
  delete query.window
  delete query.tab
  return query
}

function closeDetail(): void {
  replaceQuery(queryWithoutDetail())
}

function onDetailTabChange(tab: DetailTabId): void {
  if (!detailWindow.value) return
  replaceQuery({ ...route.query, ...detailQuery('colony', tab) })
}

onMounted(() => {
  void store.loadState(currentCampaignId())
})

// Deep-Link-Wechsel zwischen Kampagnen ohne Neumontage der Komponente berücksichtigen.
watch(
  () => [route.params.campaignId, route.params.systemId],
  ([id]) => {
    if (typeof id === 'string') void store.loadState(id)
  },
)

watch(
  () => [homeSystemStatus.value, homeSystemData.value?.systemId, currentSystemId()],
  ([status, systemId, requestedSystemId]) => {
    if (status !== 'ready' || typeof systemId !== 'string' || systemId === requestedSystemId) return
    void router.replace({
      name: 'campaign-system',
      params: { campaignId: currentCampaignId(), systemId },
      query: route.query,
    })
  },
)

// Kolonieübersicht laden, sobald der Kampagnenzustand samt Linkrelation bereitsteht.
watch(
  status,
  (value) => {
    if (value === 'ready' && links.value.colonies) void colony.loadColonies(links.value.colonies)
  },
  { immediate: true },
)

// Planetenauswahl der Systemansicht in den Kolonie-Store spiegeln (Maus, Picking, Liste und URL).
watch(
  () => selectedPlanet.value?.id ?? null,
  (planetId) => void colony.selectPlanet(planetId),
)

watch(
  () => selectedPlanet.value?.id ?? null,
  (planetId) => {
    if (homeSystemStatus.value === 'ready' && planetId && rawDetailWindow.value === undefined) {
      replaceQuery({ ...route.query, ...detailQuery('colony', detailTab.value) })
    }
  },
)

// Auswahl öffnet das Planet-/Koloniefenster; Schließen entfernt nur den Fensterzustand.
watch(
  () => [homeSystemStatus.value, route.query.object, rawDetailWindow.value, rawDetailTab.value],
  ([status, , rawWindow, rawTab]) => {
    if (status !== 'ready') return
    if (
      !isDetailWindow(rawWindow) &&
      (rawWindow !== undefined || route.query.object === undefined)
    ) {
      replaceQuery(queryWithoutDetail())
    } else if (
      isDetailWindow(rawWindow) &&
      route.query.object !== undefined &&
      !isDetailTab(rawTab)
    ) {
      replaceQuery({ ...route.query, tab: 'overview' })
    }
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
        :system-id="currentSystemId()"
        data-testid="campaign-home-system"
      />

      <ColonyDetailWindow
        v-if="selectedPlanet && detailWindow === 'colony'"
        :planet="selectedPlanet"
        :initial-tab="detailTab"
        data-testid="campaign-colony-detail"
        @close="closeDetail"
        @tab-change="onDetailTabChange"
      />

      <nav class="campaign__context" aria-label="Kampagnenkontext" data-testid="campaign-context">
        <RouterLink :to="{ name: 'campaigns' }">Kampagnen</RouterLink>
        <span aria-hidden="true">→</span>
        <RouterLink
          :to="{
            name: 'campaign',
            params: { campaignId: state.campaignId },
            query: route.query,
          }"
        >
          Kampagne {{ state.campaignId }}
        </RouterLink>
        <template v-if="homeSystemData">
          <span aria-hidden="true">→</span>
          <span data-testid="campaign-context-system">{{ homeSystemData.displayNameKey }}</span>
        </template>
        <template v-if="selectedObject">
          <span aria-hidden="true">→</span>
          <span data-testid="campaign-context-object">{{ selectedObject.displayNameKey }}</span>
        </template>
      </nav>

      <nav class="campaign__nav" aria-label="Kampagnennavigation" data-testid="campaign-nav">
        <h2>Reich</h2>
        <ul>
          <li v-if="links.colonies" data-testid="nav-colonies">Kolonien</li>
          <li v-if="links.population" data-testid="nav-population">Bevölkerung</li>
          <li v-if="links.economy" data-testid="nav-economy">Grundversorgung</li>
        </ul>
        <p class="campaign__hint">
          Wähle den Heimatplaneten in der Systemansicht, um das modale Kolonie- und Planetdetail zu
          öffnen.
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

.campaign__context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.9rem;
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
