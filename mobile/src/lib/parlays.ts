import {
  parlayDocument,
  sortedParlays,
  type TimestampedParlay,
} from '@shared/firestoreDocs'
import type { GeneratedParlay } from '@shared/types'
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'

// Thin SDK plumbing. The document shape and the read transform live in
// shared/firestoreDocs.ts, because those are what a rules or schema change
// touches and what the two clients used to duplicate.

export const saveParlayToUser = async (userId: string, parlay: GeneratedParlay) => {
  const ref = await addDoc(
    collection(db, 'parlays'),
    parlayDocument(userId, parlay, serverTimestamp())
  )
  return ref.id
}

// `depth` is the tier's history depth, newest first; null means unbounded.
export const getUserParlays = (
  userId: string,
  callback: (parlays: GeneratedParlay[]) => void,
  onError: (message: string) => void,
  depth: number | null = null
) =>
  onSnapshot(
    query(collection(db, 'parlays'), where('userId', '==', userId)),
    snapshot => {
      callback(
        sortedParlays(
          snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            data: docSnap.data() as TimestampedParlay,
          })),
          depth
        )
      )
    },
    // Web logs and returns an empty list here, which is indistinguishable from
    // "no saved parlays". Surface it instead.
    error => onError(error.message)
  )
