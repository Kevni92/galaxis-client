import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-a0/**', 'e2e-a1/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
