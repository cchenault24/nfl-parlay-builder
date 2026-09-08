import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { db } from '../firebase'

type CacheEntry<T> = { value: T; updatedAt: number }

function cacheDocRef<T>(key: string) {
  return db()
    .collection('cache')
    .doc(key)
    .withConverter<CacheEntry<T>>({
      toFirestore: (data: CacheEntry<T>) => data,
      fromFirestore: (snap: QueryDocumentSnapshot) =>
        snap.data() as CacheEntry<T>,
    })
}

export async function getCached<T>(
  key: string,
  ttlMs: number
): Promise<T | null> {
  const docSnap = await cacheDocRef<T>(key).get()
  if (!docSnap.exists) {
    return null
  }
  const data = docSnap.data() as CacheEntry<T>
  if (Date.now() - data.updatedAt > ttlMs) {
    return null
  }
  return data.value
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  await cacheDocRef<T>(key).set(
    { value, updatedAt: Date.now() },
    { merge: true }
  )
}
