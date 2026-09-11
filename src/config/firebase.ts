import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { normalizeStoredParlay, type StoredParlay } from '@shared/parlays'
import type { GeneratedParlay, UserProfile } from '../types'
import { isLocalDevelopment } from './api'

export type { UserProfile }

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Local dev has no cloud project behind it — Auth and Firestore both run in the
// emulator suite that start-dev.js launches (ports from firebase.json). These
// must be connected before anything reads or writes.
if (isLocalDevelopment()) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)
export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)
export const logOut = () => signOut(auth)
export const onAuthUserChanged = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback)

export const createUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) {
    const { displayName, email, photoURL } = user
    await setDoc(userRef, {
      displayName: displayName || email?.split('@')[0] || 'User',
      email,
      // Null rather than a generated avatar URL. The previous fallback embedded
      // the user's email address in a query string to api.dicebear.com, so every
      // email/password signup shipped their email to a third party on each
      // avatar render, and the URL was stored in Firestore permanently. Both
      // clients already fall back locally — a person icon on iOS, the first
      // initial on web — so the remote call bought nothing.
      photoURL: photoURL ?? null,
      createdAt: Timestamp.now(),
    })
  }
  return userRef
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) {
    return null
  }
  const data = snap.data()
  if (!data.displayName || !data.email || !data.createdAt) {
    return null
  }
  return {
    uid: userId,
    displayName: data.displayName,
    email: data.email,
    photoURL: data.photoURL || undefined,
    createdAt: data.createdAt,
    savedParlays: data.savedParlays || [],
  }
}

// Firestore rules require userId, gameIds, legs and a server-set createdAt.
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

// `depth` is the tier's history depth, newest first; null means unbounded. It
// is applied after the sort rather than as a Firestore limit() because the
// ordering key is derived from two possible fields, and because this is a view
// restriction rather than a boundary — firestore.rules lets a user read every
// parlay they saved, and nothing here pretends otherwise.
export const getUserParlays = (
  userId: string,
  callback: (parlays: GeneratedParlay[]) => void,
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
    error => {
      console.error('Error fetching user parlays:', error)
      callback([])
    }
  )
