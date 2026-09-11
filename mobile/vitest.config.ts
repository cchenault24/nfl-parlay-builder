import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// Mirrors the `@/` and `@shared/` aliases in tsconfig.json.
//
// Nothing under test imports react-native, so this needs no React Native preset
// and no renderer — but that is a property of what is currently tested, not a
// claim that the screens hold no logic. They do: decisions worth pinning have
// accumulated in `.tsx` files, and the answer is to lift each one into a plain
// module next to the component (see lib/auth/authErrors.ts,
// shared/legal/ageVerification.ts) rather than to assume they are not there.
//
// `.tsx` is included in the glob deliberately, even though no such test exists
// yet: with a `.ts`-only glob a contributor who writes `Foo.test.tsx` gets a
// file that never runs and a green CI telling them it passed. A component test
// added here will fail loudly for want of a renderer, which is the correct
// signal — adding one is a real decision, not something to discover by
// accident.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@shared': resolve('../shared'),
      '@': resolve('./src'),
    },
  },
})
