import {
  parlayDocument,
  sortedParlays,
  type TimestampedParlay,
} from '@shared/firestoreDocs'
import type { GeneratedParlay } from '@shared/types'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'

// Thin SDK plumbing. The document shape and the read transform live in
// shared/firestoreDocs.ts, because those are what a rules or schema change
// touches and what the two clients used to duplicate.

// Which parlays this session already saved. The screen that saves is popped
// and re-pushed freely, and a per-screen flag let Save create the same History
// document twice. A cache of re-creatable runs does not need this to survive a
// relaunch.
// Keyed by the run's id, holding the document id, so a delete from History can
// un-mark the run's Save button as well.
const savedThisSession = new Map<string, string>()

export const isParlaySaved = (parlayId: string) => savedThisSession.has(parlayId)

export const saveParlayToUser = async (userId: string, parlay: GeneratedParlay) => {
  const ref = await addDoc(
    collection(db, 'parlays'),
    parlayDocument(userId, parlay, serverTimestamp())
  )
  savedThisSession.set(parlay.parlayId, ref.id)
  return ref.id
}

// A loaded parlay's `parlayId` is its document id (see shared/firestoreDocs).
// The History listener drops the card on its own once the delete lands.
export const deleteSavedParlay = async (docId: string) => {
  await deleteDoc(doc(db, 'parlays', docId))
  for (const [runId, savedDocId] of savedThisSession) {
    if (savedDocId === docId) {
      savedThisSession.delete(runId)
    }
  }
}

// The parlays the History listener last delivered, by id, so a pushed screen
// can render one without a second read. A cold start onto the saved-parlay
// route finds nothing here and says so.
const loaded = new Map<string, GeneratedParlay>()

export const getLoadedParlay = (parlayId: string | undefined) =>
  parlayId ? loaded.get(parlayId) : undefined

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
      const parlays = sortedParlays(
        snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          data: docSnap.data() as TimestampedParlay,
        })),
        depth
      )
      loaded.clear()
      for (const parlay of parlays) {
        loaded.set(parlay.parlayId, parlay)
      }
      callback(parlays)
    },
    // Web logs and returns an empty list here, which is indistinguishable from
    // "no saved parlays". Surface it instead.
    error => onError(error.message)
  )
