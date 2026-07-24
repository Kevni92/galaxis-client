<script setup lang="ts">
// Feature: GAL-COLONY-HOME-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (/colonies, /population, /economy)
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md
//
// Modales Detailfenster über der 3D-Systemansicht: Planetengrunddaten, Kolonieidentität und -status,
// Bevölkerung und Grundversorgung in Tabs mit Property-Grids. Es werden ausschließlich serverbekannte,
// über Linkrelationen geladene Werte dargestellt; Prognosen tragen einen Datenstand. Es gibt keine
// editierbaren Steuerelemente ohne Serverbefehl. Auswahl und Fensterzustand sind Clientzustand.
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ErrorNotice, ModalWindow } from '@/shared/ui'
import { useColonyStore } from './colonyStore'
import { formatCoverageDays, formatInstant, formatInteger } from './colonyFormat'

/** Serverbekannte Planetauswahl aus der Systemansicht; nur zur Grunddarstellung, keine Ableitung. */
interface SelectedPlanet {
  id: string
  displayNameKey: string
  knowledgeLevel: string
  x: number
  y: number
}

const props = defineProps<{ planet: SelectedPlanet }>()
const emit = defineEmits<{ close: [] }>()

const store = useColonyStore()
const { selectedColony, population, economy, detailStatus, detailError } = storeToRefs(store)

type TabId = 'overview' | 'population' | 'supply'

const activeTab = ref<TabId>('overview')

/** Bevölkerung und Grundversorgung existieren nur mit bekannter Kolonie. */
const hasColony = computed(() => selectedColony.value !== null)

const tabs = computed<{ id: TabId; label: string }[]>(() => {
  const list: { id: TabId; label: string }[] = [{ id: 'overview', label: 'Übersicht' }]
  if (hasColony.value) {
    list.push({ id: 'population', label: 'Bevölkerung' })
    list.push({ id: 'supply', label: 'Grundversorgung' })
  }
  return list
})

// Beim Wechsel des Planeten immer wieder mit der Übersicht beginnen.
watch(
  () => props.planet.id,
  () => (activeTab.value = 'overview'),
)

// Fällt der aktive Tab weg (z. B. Kolonie unbekannt), auf die Übersicht zurückfallen.
watch(tabs, (list) => {
  if (!list.some((tab) => tab.id === activeTab.value)) activeTab.value = 'overview'
})

function tabPanelId(id: TabId): string {
  return `colony-tabpanel-${id}`
}

function tabButtonId(id: TabId): string {
  return `colony-tab-${id}`
}

function focusTab(id: TabId): void {
  activeTab.value = id
  document.getElementById(tabButtonId(id))?.focus()
}

/** Pfeiltasten wechseln den Tab entlang der Tableiste (ARIA-Tastaturmuster). */
function onTablistKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  event.preventDefault()
  const list = tabs.value
  const index = list.findIndex((tab) => tab.id === activeTab.value)
  const delta = event.key === 'ArrowRight' ? 1 : -1
  const next = list[(index + delta + list.length) % list.length]
  focusTab(next.id)
}
</script>

<template>
  <ModalWindow
    :title="planet.displayNameKey"
    :subtitle="planet.id"
    data-testid="colony-detail-window"
    @close="emit('close')"
  >
    <div
      class="colony-tabs"
      role="tablist"
      aria-label="Planet- und Koloniedetails"
      @keydown="onTablistKeydown"
    >
      <button
        v-for="tab in tabs"
        :id="tabButtonId(tab.id)"
        :key="tab.id"
        type="button"
        role="tab"
        class="colony-tabs__tab"
        :aria-selected="activeTab === tab.id ? 'true' : 'false'"
        :aria-controls="tabPanelId(tab.id)"
        :tabindex="activeTab === tab.id ? 0 : -1"
        :data-selected="activeTab === tab.id ? 'true' : undefined"
        :data-testid="`colony-tab-${tab.id}`"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Übersicht: Planetengrunddaten und Kolonieidentität/-status. -->
    <section
      v-show="activeTab === 'overview'"
      :id="tabPanelId('overview')"
      role="tabpanel"
      :aria-labelledby="tabButtonId('overview')"
      data-testid="colony-panel-overview"
    >
      <h3 class="colony-section__heading">Planet</h3>
      <dl class="colony-grid" data-testid="planet-facts">
        <div>
          <dt>Name</dt>
          <dd data-testid="planet-name">{{ planet.displayNameKey }}</dd>
        </div>
        <div>
          <dt>Kategorie</dt>
          <dd data-testid="planet-category">
            {{ selectedColony?.planet.category ?? 'unbekannt' }}
          </dd>
        </div>
        <div>
          <dt>Größe</dt>
          <dd data-testid="planet-size">{{ selectedColony?.planet.size ?? 'unbekannt' }}</dd>
        </div>
        <div>
          <dt>Wissensstufe</dt>
          <dd data-testid="planet-knowledge">{{ planet.knowledgeLevel }}</dd>
        </div>
        <div>
          <dt>Lokale Position (XY)</dt>
          <dd data-testid="planet-position">{{ planet.x }} / {{ planet.y }}</dd>
        </div>
      </dl>

      <template v-if="selectedColony">
        <h3 class="colony-section__heading">Kolonie</h3>
        <dl class="colony-grid" data-testid="colony-facts">
          <div>
            <dt>Kolonie-ID</dt>
            <dd data-testid="colony-id">{{ selectedColony.colonyId }}</dd>
          </div>
          <div>
            <dt>Heimatkolonie</dt>
            <dd data-testid="colony-home">{{ selectedColony.isHomeColony ? 'Ja' : 'Nein' }}</dd>
          </div>
          <div>
            <dt>Lebenszyklus</dt>
            <dd data-testid="colony-lifecycle">{{ selectedColony.lifecycleState }}</dd>
          </div>
          <div>
            <dt>Spezialisierung</dt>
            <dd data-testid="colony-specialization">{{ selectedColony.specialization }}</dd>
          </div>
        </dl>
      </template>

      <p v-else-if="detailStatus === 'no-colony'" class="colony-empty" data-testid="colony-none">
        Für diesen bekannten Planeten ist keine Kolonie sichtbar.
      </p>
    </section>

    <!-- Bevölkerung: aggregierte Startbevölkerung der Heimatkolonie. -->
    <section
      v-if="hasColony"
      v-show="activeTab === 'population'"
      :id="tabPanelId('population')"
      role="tabpanel"
      :aria-labelledby="tabButtonId('population')"
      data-testid="colony-panel-population"
    >
      <p v-if="detailStatus === 'loading'" data-testid="population-loading">
        Bevölkerung wird geladen …
      </p>
      <ErrorNotice
        v-else-if="detailStatus === 'error' && detailError"
        :error="detailError"
        retry="always"
        data-testid="population-error"
        @retry="store.reloadDetail()"
      />
      <template v-else-if="population">
        <dl class="colony-grid" data-testid="population-facts">
          <div>
            <dt>Gesamtbevölkerung</dt>
            <dd data-testid="population-total">{{ formatInteger(population.totalPopulation) }}</dd>
          </div>
          <div>
            <dt>Erwerbsfähig</dt>
            <dd data-testid="population-employable">
              {{ formatInteger(population.employablePopulation) }}
            </dd>
          </div>
          <div>
            <dt>Beschäftigt</dt>
            <dd data-testid="population-employed">
              {{ formatInteger(population.employedPopulation) }}
            </dd>
          </div>
          <div>
            <dt>Arbeitslos</dt>
            <dd data-testid="population-unemployed">
              {{ formatInteger(population.unemployedPopulation) }}
            </dd>
          </div>
          <div>
            <dt>Nicht erwerbstätig</dt>
            <dd data-testid="population-nonworkforce">
              {{ formatInteger(population.nonWorkforcePopulation) }}
            </dd>
          </div>
        </dl>
        <p class="colony-datastate" data-testid="population-datastate">
          Datenstand: {{ formatInstant(population.generatedAt) }} · Zustandsversion
          {{ population.stateVersion }}
        </p>
      </template>
      <p v-else class="colony-empty" data-testid="population-empty">
        Keine Bevölkerungsdaten verfügbar.
      </p>
    </section>

    <!-- Grundversorgung: Bestand und prognostizierte Reichweite. -->
    <section
      v-if="hasColony"
      v-show="activeTab === 'supply'"
      :id="tabPanelId('supply')"
      role="tabpanel"
      :aria-labelledby="tabButtonId('supply')"
      data-testid="colony-panel-supply"
    >
      <p v-if="detailStatus === 'loading'" data-testid="supply-loading">
        Grundversorgung wird geladen …
      </p>
      <ErrorNotice
        v-else-if="detailStatus === 'error' && detailError"
        :error="detailError"
        retry="always"
        data-testid="supply-error"
        @retry="store.reloadDetail()"
      />
      <template v-else-if="economy">
        <dl class="colony-grid" data-testid="supply-facts">
          <div>
            <dt>Bestand</dt>
            <dd data-testid="supply-quantity">
              {{ formatInteger(economy.essentialSupply.quantity) }}
            </dd>
          </div>
          <div>
            <dt>Reserviert</dt>
            <dd data-testid="supply-reserved">
              {{ formatInteger(economy.essentialSupply.reserved) }}
            </dd>
          </div>
          <div>
            <dt>Verfügbar</dt>
            <dd data-testid="supply-available">
              {{ formatInteger(economy.essentialSupply.available) }}
            </dd>
          </div>
          <div>
            <dt>Reichweite <span class="colony-badge">Prognose</span></dt>
            <dd data-testid="supply-coverage">
              {{ formatCoverageDays(economy.essentialSupply.coverageDays) }}
            </dd>
          </div>
        </dl>
        <p class="colony-datastate" data-testid="supply-datastate">
          Prognose-Datenstand: {{ formatInstant(economy.generatedAt) }} · Zustandsversion
          {{ economy.stateVersion }}
        </p>
      </template>
      <p v-else class="colony-empty" data-testid="supply-empty">
        Keine Grundversorgungsdaten verfügbar.
      </p>
    </section>

    <template #actions>
      <button
        type="button"
        class="colony-action"
        data-testid="colony-close-action"
        @click="emit('close')"
      >
        Schließen
      </button>
    </template>
  </ModalWindow>
</template>

<style scoped>
.colony-tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  border-bottom: 1px solid var(--color-border, #3a3f55);
}

.colony-tabs__tab {
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0.4rem 0.65rem;
  font: inherit;
}

.colony-tabs__tab[data-selected='true'] {
  border-bottom-color: var(--color-accent, #4f7cff);
  font-weight: 600;
}

.colony-section__heading {
  margin: 0.5rem 0 0.4rem;
  font-size: 0.9rem;
  opacity: 0.85;
}

.colony-grid {
  margin: 0 0 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.5rem 1.25rem;
}

.colony-grid dt {
  font-size: 0.75rem;
  opacity: 0.75;
}

.colony-grid dd {
  margin: 0;
  font-weight: 600;
}

.colony-badge {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.05rem 0.35rem;
  border-radius: 0.25rem;
  background: var(--color-surface-muted, rgba(79, 124, 255, 0.16));
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.colony-datastate {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.7;
}

.colony-empty {
  margin: 0.25rem 0;
  opacity: 0.85;
}

.colony-action {
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
</style>
