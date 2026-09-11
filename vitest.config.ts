import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// `shared/` is a root-level directory consumed by both clients, so its tests
// run here rather than borrowing one client's runner. Web's own components have
// no tests; if they ever do, they belong in this project too.
export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts'],
    environment: 'node',
    silent: 'passed-only',
  },
  resolve: {
    alias: {
      '@shared': resolve('./shared'),
    },
  },
})
