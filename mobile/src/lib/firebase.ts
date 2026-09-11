import { secureAuthStorage } from '@/lib/auth/secureStorage'
import {
  toUserProfile,
  userProfileDocument,
  type StoredUserProfile,
} from '@shared/firestoreDocs'
// Auth is imported from the scoped package, not `firebase/auth`: the umbrella
// package's exports map has no `react-native` condition, so Metro would hand
// us the browser build, which has no getReactNativePersistence. Without that,
// auth falls back to in-memory and the user is signed out on every cold start.
import {
  createUserWithEmailAndPassword,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
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

// The Firestore SDK's Timestamp is the one piece `shared/` cannot name — it
// deliberately stays free of the SDK — so the shape is generic there and gets
// its timestamp type here.
export type UserProfile = StoredUserProfile<Timestamp>

// Every var has to be read as a literal `process.env.EXPO_PUBLIC_*` expression.
// babel-preset-expo substitutes those at build time and leaves a computed
// `process.env[name]` untouched, and @expo/metro-config only injects a runtime
// process.env object when `dev` is true. So a computed read resolves in the
// emulator and is undefined in a release build — which threw here at module
// scope and took the app down on launch, before anything could render.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy mobile/.env.example to mobile/.env.local and fill it in.`
    )
  }
  return value
}

const app = initializeApp({
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: requireEnv(
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  ),
  projectId: requireEnv(
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  ),
  storageBucket: requireEnv(
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: requireEnv(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
})

// initializeAuth rather than getAuth: getAuth would pick the default in-memory
// persistence before we get a chance to supply our own.
//
// The store is the iOS keychain, not AsyncStorage. What Firebase persists here
// includes a refresh token that mints fresh ID tokens indefinitely and never
// expires on its own, and AsyncStorage on iOS is a plain file in the app's
// Documents directory that goes into device backups — so an unencrypted backup
// or a lost phone was full account takeover with no password.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(secureAuthStorage),
})

export const db = getFirestore(app)

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

export const signInWithGoogleCredential = (credential: AuthCredential) =>
  signInWithCredential(auth, credential)

export const requestPasswordReset = (email: string) =>
  sendPasswordResetEmail(auth, email)

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
