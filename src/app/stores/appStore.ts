import { defineStore } from 'pinia'
import { ref } from 'vue'
import { appConfig } from '@/shared/config/appConfig'

/**
 * Anwendungsweiter Clientzustand der App-Shell.
 *
 * Hält nur clientseitige, technische Zustände (z. B. aufgelöste Konfiguration).
 * Fachlicher Spielzustand gehört ausschließlich zum Server und wird hier nicht modelliert.
 */
export const useAppStore = defineStore('app', () => {
  const apiBaseUrl = ref(appConfig.apiBaseUrl)

  /** True, wenn Aufrufe server-relativ erfolgen (keine explizite Basis-URL konfiguriert). */
  function isServerRelative(): boolean {
    return apiBaseUrl.value === ''
  }

  return { apiBaseUrl, isServerRelative }
})
