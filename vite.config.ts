import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Nur für den A0-E2E-Smoke gegen den echten Server gesetzt (scripts/run-e2e-a0.mjs):
// leitet gleichen-Origin-Aufrufe unter /api an den lokal laufenden Server weiter, damit der
// Bearer-Client (server-relative Basis-URL) ohne CORS-Konfiguration gegen ihn läuft.
const e2eApiProxyTarget = process.env.VITE_E2E_API_PROXY_TARGET

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    ...(e2eApiProxyTarget
      ? { proxy: { '/api': { target: e2eApiProxyTarget, changeOrigin: true } } }
      : {}),
  },
})
