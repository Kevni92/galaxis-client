<script setup lang="ts">
// Feature: GAL-GALAXY-HOME-VIEW-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1-a1.yaml (/systems/{systemId})
// Designentscheidung: docs/decisions/0007-client-ui-rendering-und-lokalisierung.md
//
// Bekannte 3D-Heimatsystemansicht mit gleichwertiger, tastaturbedienbarer Objektliste. Die Szene
// wird über die gekapselte Rendering-Schicht angesprochen; diese Komponente ruft Three.js nie direkt
// auf. Es erscheinen ausschließlich serverseitig bekannte Objekte; die Auswahl ist Clientzustand und
// bleibt über die URL nachvollziehbar.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ErrorNotice } from '@/shared/ui'
import { useHomeSystemStore } from './homeSystemStore'
import type { SystemScene, SystemSceneFactory } from './rendering/systemScene'

const props = defineProps<{
  /** Linkrelation `galaxy` aus dem Kampagnenzustand; der Client baut die URL nicht selbst. */
  galaxyLink: string
  /** Injizierbare Szenenfabrik; ohne Angabe wird die Three.js-Schicht erst zur Laufzeit geladen. */
  sceneFactory?: SystemSceneFactory
}>()

const route = useRoute()
const router = useRouter()
const store = useHomeSystemStore()
const { status, error, objects, sceneObjects, selectedObjectId, selectedObject } =
  storeToRefs(store)

const canvasRef = ref<HTMLCanvasElement | null>(null)
let scene: SystemScene | null = null
let resizeObserver: ResizeObserver | null = null

async function ensureScene(): Promise<void> {
  if (scene || !canvasRef.value) return
  const factory =
    props.sceneFactory ?? (await import('./rendering/threeSystemScene')).createThreeSystemScene
  const canvas = canvasRef.value
  if (!canvas) return
  scene = factory(canvas)
  scene.onSelect((id) => store.select(id))
  scene.setObjects(sceneObjects.value)
  scene.setSelection(selectedObjectId.value)
  const parent = canvas.parentElement
  if (parent && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (scene && canvas.parentElement) {
        scene.resize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight)
      }
    })
    resizeObserver.observe(parent)
    scene.resize(parent.clientWidth, parent.clientHeight)
  }
}

async function load(): Promise<void> {
  await store.loadFromGalaxy(props.galaxyLink)
  // Auswahl aus der URL erst nach dem Laden anwenden; unbekannte IDs verwirft der Store.
  const fromUrl = route.query.object
  if (typeof fromUrl === 'string') store.select(fromUrl)
}

onMounted(load)

watch(status, async (value) => {
  if (value === 'ready') {
    await nextTick()
    await ensureScene()
  }
})

watch(sceneObjects, (value) => scene?.setObjects(value))

watch(selectedObjectId, (id) => {
  scene?.setSelection(id)
  const next = id ?? undefined
  if (route.query.object !== next) {
    void router.replace({ query: { ...route.query, object: next } })
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  scene?.dispose()
  scene = null
})
</script>

<template>
  <section class="home-system" data-testid="home-system-view">
    <p v-if="status === 'loading'" data-testid="home-system-loading">Heimatsystem wird geladen …</p>

    <ErrorNotice
      v-else-if="status === 'error' && error"
      :error="error"
      retry="always"
      data-testid="home-system-error"
      @retry="load()"
    />

    <div v-else-if="status === 'ready'" class="home-system__body">
      <div class="home-system__scene" data-testid="home-system-scene">
        <canvas ref="canvasRef" class="home-system__canvas" aria-hidden="true"></canvas>
      </div>

      <aside class="home-system__panel">
        <h2 id="home-system-objects-heading">Bekannte Objekte</h2>
        <ul
          class="home-system__objects"
          role="listbox"
          aria-labelledby="home-system-objects-heading"
          data-testid="home-system-objects"
        >
          <li v-for="object in objects" :key="object.id" role="presentation">
            <button
              type="button"
              class="home-system__object"
              role="option"
              :aria-selected="object.id === selectedObjectId ? 'true' : 'false'"
              :data-kind="object.kind"
              :data-selected="object.id === selectedObjectId ? 'true' : undefined"
              :data-testid="`object-${object.id}`"
              @click="store.select(object.id)"
            >
              <span class="home-system__object-name">{{ object.displayNameKey }}</span>
              <span class="home-system__object-kind">{{ object.kind }}</span>
            </button>
          </li>
        </ul>

        <div
          v-if="selectedObject"
          class="home-system__selection"
          data-testid="home-system-selection"
        >
          <h3>Auswahl</h3>
          <dl>
            <div>
              <dt>Objekt</dt>
              <dd data-testid="selection-name">{{ selectedObject.displayNameKey }}</dd>
            </div>
            <div>
              <dt>Art</dt>
              <dd data-testid="selection-kind">{{ selectedObject.kind }}</dd>
            </div>
            <div>
              <dt>Wissensstufe</dt>
              <dd data-testid="selection-knowledge">{{ selectedObject.knowledgeLevel }}</dd>
            </div>
            <div>
              <dt>Lokale Position (XY)</dt>
              <dd data-testid="selection-position">
                {{ selectedObject.x }} / {{ selectedObject.y }}
              </dd>
            </div>
          </dl>
          <p v-if="selectedObject.kind === 'planet'" class="home-system__hint">
            Das modale Planet- und Koloniedetail folgt im nächsten A1-Schritt.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.home-system__body {
  display: grid;
  grid-template-columns: 1fr minmax(16rem, 22rem);
  gap: 1rem;
  min-height: 24rem;
}

@media (max-width: 48rem) {
  .home-system__body {
    grid-template-columns: 1fr;
  }
}

.home-system__scene {
  position: relative;
  min-height: 24rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.5rem;
  overflow: hidden;
}

.home-system__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.home-system__objects {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.home-system__object {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.home-system__object[data-selected='true'] {
  border-color: var(--color-accent, #4f7cff);
  background: var(--color-surface-muted, rgba(79, 124, 255, 0.12));
}

.home-system__object-kind {
  font-size: 0.75rem;
  opacity: 0.75;
}

.home-system__selection dl {
  margin: 0;
  display: grid;
  gap: 0.4rem;
}

.home-system__selection dt {
  font-size: 0.75rem;
  opacity: 0.75;
}

.home-system__selection dd {
  margin: 0;
  font-weight: 600;
}

.home-system__hint {
  opacity: 0.85;
  font-size: 0.85rem;
}
</style>
