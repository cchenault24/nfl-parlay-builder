import * as admin from 'firebase-admin'

export type CacheEntry<T> = { value: T; updatedAt: number }

const db = admin.firestore()

export function cacheDocRef<T>(key: string) {
  return db
    .collection('v2_cache')
    .doc(key)
    .withConverter<CacheEntry<T>>({
      toFirestore: (data: CacheEntry<T>) => data,
      fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) =>
        snap.data() as CacheEntry<T>,
    })
}

export async function getCached<T>(
  key: string,
  ttlMs: number
): Promise<T | null> {
  const docSnap = await cacheDocRef<T>(key).get()
  if (!docSnap.exists) return null
  const data = docSnap.data() as CacheEntry<T>
  const now = Date.now()
  if (now - data.updatedAt > ttlMs) return null
  return data.value
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  await cacheDocRef<T>(key).set(
    { value, updatedAt: Date.now() },
    { merge: true }
  )
}
