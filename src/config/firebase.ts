import {
  parlayDocument,
  sortedParlays,
  toUserProfile,
  userProfileDocument,
  type TimestampedParlay,
} from '@shared/firestoreDocs'
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

// Thin SDK plumbing. The document shape and the profile validation live in
// shared/firestoreDocs.ts, so both clients write and read `users/{uid}` the
// same way by construction rather than by two matching copies.
export const createUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) {
    await setDoc(userRef, userProfileDocument(user, Timestamp.now()))
  }
  return userRef
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', userId))
  return toUserProfile<Timestamp>(userId, snap.data())
}

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
    error => {
      // iOS surfaces this to the user instead. Returning an empty list here is
      // indistinguishable from "no saved parlays" and predates that.
      console.error('Error fetching user parlays:', error)
      callback([])
    }
  )
