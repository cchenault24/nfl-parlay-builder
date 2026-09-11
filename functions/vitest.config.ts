import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Node, not jsdom: nothing under test touches a DOM, and the agent code
    // reaches for fetch/AbortSignal, which are the platform's own here.
    environment: 'node',
  },
})
