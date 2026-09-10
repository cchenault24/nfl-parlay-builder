import AsyncStorage from '@react-native-async-storage/async-storage'
// Auth is imported from the scoped package, not `firebase/auth`: the umbrella
// package's exports map has no `react-native` condition, so Metro would hand
// us the browser build, which has no getReactNativePersistence. Without that,
// auth falls back to in-memory and the user is signed out on every cold start.
import {
  createUserWithEmailAndPassword,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type AuthCredential,
  type User,
} from '@firebase/auth'
import { initializeApp } from 'firebase/app'
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  Timestamp,
} from 'firebase/firestore'

// Depends on the Firestore SDK's Timestamp, which `shared/` deliberately
// stays free of, so it is declared here rather than imported from @shared.
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[]
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy mobile/.env.example to mobile/.env.local and fill it in.`
    )
  }
  return value
}

const app = initializeApp({
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
})

// initializeAuth rather than getAuth: getAuth would pick the default
// in-memory persistence before we get a chance to supply AsyncStorage.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
})

export const db = getFirestore(app)

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

export const signInWithGoogleCredential = (credential: AuthCredential) =>
  signInWithCredential(auth, credential)

export const logOut = () => signOut(auth)

export const onAuthUserChanged = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback)

// Mirrors the web app's createUserProfile so both clients write the same
// shape into `users/{uid}`.
export const createUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) {
    const { displayName, email, photoURL } = user
    await setDoc(userRef, {
      displayName: displayName || email?.split('@')[0] || 'User',
      email,
      photoURL: photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${email}`,
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
