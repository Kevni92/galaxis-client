import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const env = loadEnv('development', process.cwd(), '')
const devApiProxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:3000'
// Der A0-E2E-Smoke setzt dieses Ziel explizit (scripts/run-e2e-a0.mjs).
const previewApiProxyTarget = process.env.VITE_E2E_API_PROXY_TARGET ?? env.VITE_E2E_API_PROXY_TARGET

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
    proxy: {
      '/health': { target: devApiProxyTarget, changeOrigin: true },
      '/api': { target: devApiProxyTarget, changeOrigin: true },
    },
  },
  preview: {
    ...(previewApiProxyTarget
      ? {
          proxy: {
            '/health': { target: previewApiProxyTarget, changeOrigin: true },
            '/api': { target: previewApiProxyTarget, changeOrigin: true },
          },
        }
      : {}),
  },
})
