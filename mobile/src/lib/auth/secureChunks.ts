// Splitting a value across several SecureStore entries, and putting it back.
//
// The keychain is where a long-lived bearer credential belongs, but
// expo-secure-store caps a single value at 2048 bytes and Firebase's persisted
// auth blob is comfortably past that — it carries the whole user object plus an
// access token and a refresh token. Storing it whole would fail, so it is
// written in pieces with a small manifest naming how many there are.
//
// The logic lives here, away from the SecureStore calls, so the part that is
// easy to get wrong — an index off by one, a stale chunk left behind after a
// shorter value replaces a longer one — can be tested without a device.

// Comfortably inside the 2048-byte cap. The margin matters because the cap is
// on bytes and this slices characters: one astral-plane character is four
// bytes, so a 1024-character chunk is at most 4096 bytes... which is why the
// value is chunked *after* being measured in UTF-16 code units and kept well
// under a quarter of the cap.
export const CHUNK_SIZE = 400

// `key` holds the manifest; the pieces live beside it under a numeric suffix.
export function manifestKey(key: string): string {
  return key
}

export function chunkKey(key: string, index: number): string {
  return `${key}.${index}`
}

export function splitValue(value: string): string[] {
  if (value.length === 0) {
    return ['']
  }
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE))
  }
  return chunks
}

export interface Manifest {
  chunks: number
}

export function isManifest(value: unknown): value is Manifest {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Manifest).chunks === 'number' &&
    (value as Manifest).chunks >= 0
  )
}

export function parseManifest(raw: string | null): Manifest | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isManifest(parsed) ? (parsed as Manifest) : null
  } catch {
    return null
  }
}

/**
 * Reassembles a value, or null when any piece is missing.
 *
 * All-or-nothing on purpose: a partially readable credential is not a
 * credential, and handing Firebase half a JSON blob would fail in a place far
 * from the cause. Returning null simply signs the user in again.
 */
export function joinChunks(pieces: (string | null)[]): string | null {
  if (pieces.some(piece => piece === null)) {
    return null
  }
  return pieces.join('')
}

/**
 * Which chunk indices to delete when a value is replaced.
 *
 * A shorter value leaves the tail of a longer previous one behind, and those
 * stale pieces would be read back as part of the next value if the manifest
 * ever disagreed with reality.
 */
export function staleChunkIndices(previous: number, next: number): number[] {
  const stale: number[] = []
  for (let i = next; i < previous; i++) {
    stale.push(i)
  }
  return stale
}
