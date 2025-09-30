import * as admin from 'firebase-admin'

const db = admin.firestore()

type IdempotencyRecord<T> = {
  userId: string
  key: string
  createdAt: number
  response: T
}

function idempotencyDocRef<T>(docId: string) {
  return db
    .collection('v2_idempotency')
    .doc(docId)
    .withConverter<IdempotencyRecord<T>>({
      toFirestore: (data: IdempotencyRecord<T>) => data,
      fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) =>
        snap.data() as IdempotencyRecord<T>,
    })
}

function buildIdemDocId(userId: string, key: string): string {
  const safeKey = key.replace(/[/?#%]/g, '_')
  return `${userId}:${safeKey}`
}

export async function getIdempotentResponse<T>(
  userId: string,
  key: string,
  maxAgeMs: number
): Promise<T | null> {
  const docId = buildIdemDocId(userId, key)
  const snap = await idempotencyDocRef<T>(docId).get()
  if (!snap.exists) {
    return null
  }
  const record = snap.data() as IdempotencyRecord<T>
  if (Date.now() - record.createdAt > maxAgeMs) {
    return null
  }
  return record.response
}

export async function saveIdempotentResponse<T>(
  userId: string,
  key: string,
  response: T
): Promise<void> {
  const docId = buildIdemDocId(userId, key)
  await idempotencyDocRef<T>(docId).set(
    { userId, key, createdAt: Date.now(), response },
    { merge: false }
  )
}
