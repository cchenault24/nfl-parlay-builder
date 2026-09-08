import * as admin from 'firebase-admin'

type CacheEntry<T> = { value: T; updatedAt: number }

function getDb(): FirebaseFirestore.Firestore {
  // Lazily ensure admin app exists before accessing Firestore
  // Safe in emulator and prod; no-ops if already initialized
  // admin.apps is available across admin versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apps = (admin as any).apps as unknown[] | undefined
  if (!apps || apps.length === 0) {
    try {
      admin.initializeApp()
    } catch {
      // If another module initialized concurrently, ignore
    }
  }
  return admin.firestore()
}

function cacheDocRef<T>(key: string) {
  return getDb()
    .collection('cache')
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
  if (!docSnap.exists) {
    return null
  }
  const data = docSnap.data() as CacheEntry<T>
  const now = Date.now()
  if (now - data.updatedAt > ttlMs) {
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
