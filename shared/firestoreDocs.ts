import { normalizeStoredParlay, type StoredParlay } from './parlays'
import type { GeneratedParlay } from './types'

// The document shapes and read transforms both clients share, with no Firestore
// SDK in sight — `shared/` stays free of it deliberately, so that it compiles
// under React Native and Vite without pulling the SDK into the shared graph.
//
// What lives here is everything a rules change or a schema change touches: the
// fields written, the sort key, the depth slice, and what counts as a usable
// profile. Those were duplicated character-for-character in both clients, so
// adding a required field to one and missing the other meant every parlay saved
// from the other was rejected by the rules — with the second client's behaviour
// giving no hint why. The SDK calls that wrap these stay at each edge, where
// they are four lines of plumbing rather than a decision.

// Firestore rules require userId, gameIds, legs and a server-set createdAt. The
// timestamp is the caller's, because `serverTimestamp()` is an SDK value.
export function parlayDocument<T>(
  userId: string,
  parlay: GeneratedParlay,
  createdAt: T
): Record<string, unknown> {
  return { ...parlay, userId, createdAt }
}

// Firestore may return a doc with either timestamp field, and neither is part
// of the domain type — the sort is the only thing that reads them.
export type TimestampedParlay = StoredParlay & {
  createdAt?: { toMillis?: () => number }
  savedAt?: { toMillis?: () => number }
}

function savedAtMillis(doc: TimestampedParlay): number {
  return (doc.createdAt ?? doc.savedAt)?.toMillis?.() ?? 0
}

/**
 * Newest first, then cut to the tier's history depth; null means unbounded.
 *
 * The depth is applied after the sort rather than as a Firestore `limit()`
 * because the ordering key is derived from two possible fields — and because
 * this is a view restriction rather than a boundary. firestore.rules lets a user
 * read every parlay they saved, and nothing here pretends otherwise.
 */
export function sortedParlays(
  docs: { id: string; data: TimestampedParlay }[],
  depth: number | null = null
): GeneratedParlay[] {
  const parlays = [...docs]
    .sort((a, b) => savedAtMillis(b.data) - savedAtMillis(a.data))
    .map(({ data, id }) => normalizeStoredParlay(data, id))
  return depth === null ? parlays : parlays.slice(0, depth)
}

export interface ProfileSource {
  displayName: string | null
  email: string | null
  photoURL: string | null
}

// The fields written to `users/{uid}` on first sign-in. `createdAt` is the
// caller's, for the same reason as above.
export function userProfileDocument<T>(
  user: ProfileSource,
  createdAt: T
): Record<string, unknown> {
  return {
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    email: user.email,
    // Null rather than a generated avatar URL. The previous fallback embedded
    // the user's email address in a query string to api.dicebear.com, so every
    // email/password signup shipped their email to a third party on each avatar
    // render, and the URL was stored in Firestore permanently. Both clients
    // already fall back locally — a person icon on iOS, the first initial on
    // web — so the remote call bought nothing.
    photoURL: user.photoURL ?? null,
    createdAt,
  }
}

// `createdAt` stays whatever the SDK handed back; only this client knows what a
// Firestore Timestamp is.
export interface StoredUserProfile<T> {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: T
  savedParlays?: string[]
}

/**
 * Reads a profile document, or null when it is not usable.
 *
 * A document missing displayName, email or createdAt is treated as absent
 * rather than partially rendered: the caller signs the user in either way, and
 * a half-filled profile shows a blank name where a name belongs.
 */
export function toUserProfile<T>(
  uid: string,
  data: Record<string, unknown> | undefined
): StoredUserProfile<T> | null {
  if (!data || !data.displayName || !data.email || !data.createdAt) {
    return null
  }
  return {
    uid,
    displayName: data.displayName as string,
    email: data.email as string,
    photoURL: (data.photoURL as string) || undefined,
    createdAt: data.createdAt as T,
    savedParlays: (data.savedParlays as string[]) || [],
  }
}
