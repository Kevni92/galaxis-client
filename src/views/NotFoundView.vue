<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="not-found" data-testid="not-found-view">
    <h1>Seite nicht gefunden</h1>
    <p>Der aufgerufene Pfad existiert nicht.</p>
    <RouterLink to="/">Zurück zur Startseite</RouterLink>
  </section>
</template>
