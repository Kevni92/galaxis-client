<script setup lang="ts">
import AppErrorBoundary from '@/app/error/AppErrorBoundary.vue'
import AppShell from '@/app/shell/AppShell.vue'
import { ConnectionBanner } from '@/features/connection'
</script>

<template>
  <AppErrorBoundary>
    <ConnectionBanner />
    <AppShell />
  </AppErrorBoundary>
</template>
