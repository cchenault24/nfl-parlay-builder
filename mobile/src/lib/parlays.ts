import { normalizeStoredParlay, type StoredParlay } from '@shared/parlays'
import type { GeneratedParlay } from '@shared/types'
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'

// Firestore rules require userId, gameId, legs and a server-set createdAt. A
// cross-game parlay satisfies that with `gameIds[0]`; see GeneratedParlay.
export const saveParlayToUser = async (userId: string, parlay: GeneratedParlay) => {
  const ref = await addDoc(collection(db, 'parlays'), {
    ...parlay,
    userId,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// Firestore may return a doc with either timestamp field, and neither is part
// of the domain type — the sort below is the only thing that reads them.
type TimestampedParlay = StoredParlay & {
  createdAt?: Timestamp
  savedAt?: Timestamp
}

// `depth` is the tier's history depth, newest first; null means unbounded. See
// the web copy in src/config/firebase.ts for why it is sliced here rather than
// limited in the query.
export const getUserParlays = (
  userId: string,
  callback: (parlays: GeneratedParlay[]) => void,
  onError: (message: string) => void,
  depth: number | null = null
) =>
  onSnapshot(
    query(collection(db, 'parlays'), where('userId', '==', userId)),
    snapshot => {
      const savedAtMs = (d: TimestampedParlay) =>
        (d.createdAt ?? d.savedAt)?.toMillis?.() ?? 0
      const parlays = snapshot.docs
        .map(docSnap => ({ data: docSnap.data() as TimestampedParlay, id: docSnap.id }))
        .sort((a, b) => savedAtMs(b.data) - savedAtMs(a.data))
        .map(({ data, id }) => normalizeStoredParlay(data, id))
      callback(depth === null ? parlays : parlays.slice(0, depth))
    },
    // Web logs and returns an empty list here, which is indistinguishable from
    // "no saved parlays". Surface it instead.
    error => onError(error.message)
  )
