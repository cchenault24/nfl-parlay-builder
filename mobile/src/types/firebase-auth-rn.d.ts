import type { Persistence } from '@firebase/auth'

// @firebase/auth's exports map puts a top-level "types" key ahead of its
// "react-native" condition, so TypeScript resolves dist/auth-public.d.ts (the
// web typings) no matter what customConditions say. Metro ignores the "types"
// condition and correctly loads dist/rn/index.js, which does export
// getReactNativePersistence — so the symbol exists at runtime and is missing
// only from the types. This augments it back.
declare module '@firebase/auth' {
  interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>
    getItem(key: string): Promise<string | null>
    removeItem(key: string): Promise<void>
  }

  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence
}
