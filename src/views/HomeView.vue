<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useAppStore } from '@/app/stores/appStore'

const app = useAppStore()

// Reine Entwicklungsanzeige: nur im Dev-Build laden, nicht in der produktiven Oberfläche.
const isDev = import.meta.env.DEV
const HealthPanel = defineAsyncComponent(() => import('@/features/connection/HealthPanel.vue'))
</script>

<template>
  <section class="home" data-testid="home-view">
    <h1>Galaxis Client</h1>
    <p>Technische App-Shell für den Desktop-Webclient (A0).</p>
    <p class="home__config" data-testid="api-base-url">
      API-Basis-URL:
      <code>{{ app.isServerRelative() ? '(server-relativ)' : app.apiBaseUrl }}</code>
    </p>
    <HealthPanel v-if="isDev" />
  </section>
</template>

<style scoped>
.home {
  max-width: 48rem;
}

.home__config {
  margin-top: 1rem;
  opacity: 0.85;
}
</style>
