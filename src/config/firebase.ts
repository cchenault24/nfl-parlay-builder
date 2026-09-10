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
import type { GeneratedParlay, ParlayLeg, UserProfile } from '../types'
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

// Firestore rules require userId, gameId, legs and a server-set createdAt.
export const saveParlayToUser = async (userId: string, parlay: GeneratedParlay) => {
  const ref = await addDoc(collection(db, 'parlays'), {
    ...parlay,
    userId,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

type StoredLeg = Partial<ParlayLeg> & { type?: ParlayLeg['betType']; pick?: string }
type StoredParlay = Partial<Omit<GeneratedParlay, 'legs'>> & {
  legs?: StoredLeg[]
  estimatedOdds?: number | string
  createdAt?: Timestamp
  savedAt?: Timestamp
}

// Older saves used different field names; normalize so history always renders.
// `parlayId` here is always the Firestore doc id, not the stored field — the
// same generated parlay (same runId) saved twice would otherwise carry the
// same `parlayId` in both docs, breaking React's list identity in history.
function normalizeParlay(data: StoredParlay, docId: string): GeneratedParlay {
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  return {
    parlayId: docId,
    gameId: data.gameId ?? '',
    gameContext: data.gameContext ?? '',
    week: typeof data.week === 'number' ? data.week : 0,
    gameDateTime: data.gameDateTime ?? '',
    legs: (data.legs ?? []).map(leg => ({
      betType: leg.betType ?? leg.type ?? 'moneyline',
      team: leg.team ?? '',
      player: leg.player?.trim() ? leg.player : null,
      selection: leg.selection ?? leg.pick ?? '',
      line: leg.line ?? null,
      side: leg.side ?? null,
      odds: num(leg.odds),
      confidence: num(leg.confidence),
      reasoning: leg.reasoning ?? '',
      // Saves from before this field existed were made under the old
      // all-or-nothing anchoring rule, so every leg they contain was, by
      // definition, anchored.
      anchored: leg.anchored ?? true,
    })),
    combinedOdds: num(data.combinedOdds ?? data.estimatedOdds),
    parlayConfidence: num(data.parlayConfidence),
    gameSummary: data.gameSummary ?? {
      matchupSummary: '',
      keyFactors: [],
      gamePrediction: { winner: '', projectedScore: { home: 0, away: 0 }, winProbability: 0 },
    },
    model: data.model ?? 'unknown',
    grading: data.grading,
    closingLines: data.closingLines,
    shareId: data.shareId,
  }
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
      const savedAtMs = (d: StoredParlay) =>
        (d.createdAt ?? d.savedAt)?.toMillis?.() ?? 0
      const parlays = snapshot.docs
        .map(docSnap => ({ data: docSnap.data() as StoredParlay, id: docSnap.id }))
        .sort((a, b) => savedAtMs(b.data) - savedAtMs(a.data))
        .map(({ data, id }) => normalizeParlay(data, id))
      callback(depth === null ? parlays : parlays.slice(0, depth))
    },
    error => {
      console.error('Error fetching user parlays:', error)
      callback([])
    }
  )
