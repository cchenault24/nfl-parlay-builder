import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// Mirrors the `@/` and `@shared/` aliases in tsconfig.json. Nothing under test
// imports react-native: the screens stay thin and the decisions they render live
// in plain modules, so this needs no React Native preset and no renderer.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@shared': resolve('../shared'),
      '@': resolve('./src'),
    },
  },
})
