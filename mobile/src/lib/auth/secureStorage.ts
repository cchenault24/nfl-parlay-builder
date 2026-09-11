import * as SecureStore from 'expo-secure-store'

import {
  chunkKey,
  joinChunks,
  manifestKey,
  parseManifest,
  splitValue,
  staleChunkIndices,
} from './secureChunks'

/**
 * The three methods Firebase's React Native persistence needs, backed by the
 * iOS keychain instead of AsyncStorage.
 *
 * AsyncStorage on iOS is a plain file in the app's Documents directory,
 * protected only by the default data-protection class and included in device
 * backups. Firebase's persisted blob holds a refresh token that mints fresh ID
 * tokens indefinitely and does not expire on its own — so an unencrypted Finder
 * backup, or filesystem access to a lost or jailbroken phone, is full account
 * takeover with no password, including the ability to delete the account. That
 * is what the keychain exists for.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the credential out of backups and off
 * any other device the user restores onto, which is the behaviour a session
 * token should have.
 *
 * Values are chunked: SecureStore caps one entry at 2048 bytes and the blob is
 * larger. See secureChunks.ts for that logic, which is tested on its own.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

async function readChunk(key: string, index: number): Promise<string | null> {
  return SecureStore.getItemAsync(chunkKey(key, index), OPTIONS)
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const manifest = parseManifest(
        await SecureStore.getItemAsync(manifestKey(key), OPTIONS)
      )
      if (!manifest) {
        return null
      }
      const pieces = await Promise.all(
        Array.from({ length: manifest.chunks }, (_, i) => readChunk(key, i))
      )
      return joinChunks(pieces)
    } catch {
      // An unreadable keychain is a signed-out user, not a crash on launch.
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = parseManifest(
      await SecureStore.getItemAsync(manifestKey(key), OPTIONS).catch(() => null)
    )
    const chunks = splitValue(value)

    await Promise.all(
      chunks.map((chunk, i) =>
        SecureStore.setItemAsync(chunkKey(key, i), chunk, OPTIONS)
      )
    )
    // The manifest is written last, so a failure part way through leaves the
    // previous value readable rather than a half-written one.
    await SecureStore.setItemAsync(
      manifestKey(key),
      JSON.stringify({ chunks: chunks.length }),
      OPTIONS
    )

    // A shorter value leaves the tail of a longer one behind.
    await Promise.all(
      staleChunkIndices(previous?.chunks ?? 0, chunks.length).map(i =>
        SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS).catch(() => undefined)
      )
    )
  },

  async removeItem(key: string): Promise<void> {
    const manifest = parseManifest(
      await SecureStore.getItemAsync(manifestKey(key), OPTIONS).catch(() => null)
    )
    // The manifest goes first: without it nothing can reassemble the pieces, so
    // a failure below cannot leave a readable credential behind.
    await SecureStore.deleteItemAsync(manifestKey(key), OPTIONS).catch(
      () => undefined
    )
    await Promise.all(
      Array.from({ length: manifest?.chunks ?? 0 }, (_, i) =>
        SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS).catch(() => undefined)
      )
    )
  },
}
