<script setup lang="ts">
import { useAppStore } from '@/app/stores/appStore'

const app = useAppStore()
</script>

<template>
  <section class="home" data-testid="home-view">
    <h1>Galaxis Client</h1>
    <p>Technische App-Shell für den Desktop-Webclient (A0).</p>
    <p class="home__config" data-testid="api-base-url">
      API-Basis-URL:
      <code>{{ app.isServerRelative() ? '(server-relativ)' : app.apiBaseUrl }}</code>
    </p>
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
