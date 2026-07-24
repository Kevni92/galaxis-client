<script setup lang="ts">
// Feature: GAL-CLIENT-STATE-001
// Fachlicher Vertrag: docs/contracts/rest-api/galaxis-rest-v1.md (Tag "Health", /health/live, /health/ready)
import { inject, onMounted, ref } from 'vue'
import { toUiError } from '@/shared/api'
import { HEALTH_API_KEY } from './healthInjection'

/**
 * Entwicklungsanzeige für Liveness und Readiness des Servers. Sie macht die technischen
 * Zustände direkt sichtbar und ist nicht für die produktive Spieloberfläche gedacht.
 */
type LiveState = 'unknown' | 'ok' | 'unreachable'
type ReadyState = 'unknown' | 'ready' | 'not_ready' | 'unreachable'

const api = inject(HEALTH_API_KEY, null)

const live = ref<LiveState>('unknown')
const ready = ref<ReadyState>('unknown')
const checking = ref(false)

const LIVE_LABEL: Record<LiveState, string> = {
  unknown: 'unbekannt',
  ok: 'erreichbar',
  unreachable: 'nicht erreichbar',
}

const READY_LABEL: Record<ReadyState, string> = {
  unknown: 'unbekannt',
  ready: 'bereit',
  not_ready: 'nicht bereit',
  unreachable: 'nicht erreichbar',
}

async function check(): Promise<void> {
  if (!api || checking.value) return
  checking.value = true
  try {
    await api.getLiveness()
    live.value = 'ok'
  } catch {
    live.value = 'unreachable'
  }
  try {
    const result = await api.getReadiness()
    ready.value = result.status
  } catch (error) {
    // Nur echte Transportfehler landen hier; der 503-Fall wird bereits als not_ready aufgelöst.
    void toUiError(error)
    ready.value = 'unreachable'
  } finally {
    checking.value = false
  }
}

onMounted(() => void check())
</script>

<template>
  <section class="health-panel" data-testid="health-panel" aria-label="Serverstatus (Entwicklung)">
    <h2 class="health-panel__title">Serverstatus (Entwicklung)</h2>
    <dl class="health-panel__grid">
      <dt>Erreichbarkeit</dt>
      <dd :data-state="live" data-testid="health-live-status">{{ LIVE_LABEL[live] }}</dd>
      <dt>Bereitschaft</dt>
      <dd :data-state="ready" data-testid="health-ready-status">{{ READY_LABEL[ready] }}</dd>
    </dl>
    <button
      type="button"
      class="health-panel__refresh"
      data-testid="health-refresh"
      :disabled="checking"
      @click="check"
    >
      {{ checking ? 'Wird geprüft …' : 'Aktualisieren' }}
    </button>
  </section>
</template>

<style scoped>
.health-panel {
  margin-top: 1.5rem;
  padding: 0.85rem 1rem;
  border: 1px dashed var(--color-border, #3a3f55);
  border-radius: 0.5rem;
  max-width: 24rem;
}

.health-panel__title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}

.health-panel__grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.25rem 1rem;
  margin: 0 0 0.75rem;
}

.health-panel__grid dt {
  opacity: 0.8;
}

.health-panel__grid dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.health-panel__refresh {
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--color-border, #3a3f55);
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.health-panel__refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
