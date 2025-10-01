import { initializeApp } from 'firebase/app'
import {
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
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { GeneratedParlay } from '../types'

export interface UserProfile {
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  uid?: string
  savedParlays?: string[]
}

interface AdditionalUserData {
  [key: string]: unknown
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Auth providers
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account',
})

// Auth functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)
export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)
export const logOut = () => signOut(auth)
export const onAuthUserChanged = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback)

// User profile functions
export const createUserProfile = async (
  user: User,
  additionalData?: AdditionalUserData
) => {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    const { displayName, email, photoURL } = user
    const createdAt = Timestamp.now()

    try {
      await setDoc(userRef, {
        displayName: displayName || email?.split('@')[0] || 'User',
        email,
        photoURL:
          photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${email}`,
        createdAt,
        ...additionalData,
      })
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  return userRef
}

export const getUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    return null
  }

  const data = userSnap.data()

  if (!data.displayName || !data.email || !data.createdAt) {
    console.warn('User profile missing required fields:', data)
    return null
  }

  return {
    displayName: data.displayName,
    email: data.email,
    photoURL: data.photoURL || undefined,
    createdAt: data.createdAt,
    uid: userId,
    savedParlays: data.savedParlays || [],
  } as UserProfile
}

// Parlay storage functions
export const saveParlayToUser = async (
  userId: string,
  parlayData: GeneratedParlay
) => {
  try {
    const parlayRef = await addDoc(collection(db, 'parlays'), {
      userId,
      ...parlayData,
      savedAt: Timestamp.now(),
    })
    return parlayRef.id
  } catch (error) {
    console.error('Error saving parlay:', error)
    throw error
  }
}

/**
 * Listens for real-time updates to a user's parlays.
 * @param userId The ID of the user.
 * @param callback A function that will be called with the updated list of parlays.
 * @returns The unsubscribe function to detach the listener.
 */
export const getUserParlays = (
  userId: string,
  callback: (parlays: GeneratedParlay[]) => void
) => {
  const migrateParlay = (data: any, docId: string): GeneratedParlay => {
    const migrated: any = { ...data }

    // Ensure required identifier
    if (!migrated.parlayId) {
      migrated.parlayId = docId
    }

    // Migrate odds field from older schema
    if (migrated.estimatedOdds != null && migrated.combinedOdds == null) {
      const numericOdds =
        typeof migrated.estimatedOdds === 'number'
          ? migrated.estimatedOdds
          : Number(migrated.estimatedOdds)
      migrated.combinedOdds = Number.isFinite(numericOdds) ? numericOdds : 0
    }

    // Normalize legs
    if (Array.isArray(migrated.legs)) {
      migrated.legs = migrated.legs.map((leg: any) => {
        const oddsValue =
          typeof leg?.odds === 'number' ? leg.odds : Number(leg?.odds ?? 0)
        const confidenceValueRaw =
          typeof leg?.confidence === 'number'
            ? leg.confidence
            : (leg?.confidencePct ?? leg?.confidencePercent ?? 0)
        const confidenceValue =
          typeof confidenceValueRaw === 'number'
            ? confidenceValueRaw
            : Number(confidenceValueRaw)

        return {
          betType: leg?.betType ?? leg?.type ?? 'moneyline',
          selection: leg?.selection ?? leg?.pick ?? '',
          odds: Number.isFinite(oddsValue) ? oddsValue : 0,
          confidence: Number.isFinite(confidenceValue) ? confidenceValue : 0,
          reasoning: leg?.reasoning ?? leg?.analysis ?? '',
        }
      })
    } else {
      migrated.legs = []
    }

    // Ensure gameSummary exists
    if (!migrated.gameSummary) {
      migrated.gameSummary = {
        matchupSummary: '',
        keyFactors: [],
        gamePrediction: {
          winner: '',
          projectedScore: { home: 0, away: 0 },
          winProbability: 0,
        },
      }
    } else {
      // Fill any missing nested fields defensively
      migrated.gameSummary.matchupSummary =
        migrated.gameSummary.matchupSummary ?? ''
      migrated.gameSummary.keyFactors = migrated.gameSummary.keyFactors ?? []
      migrated.gameSummary.gamePrediction = migrated.gameSummary
        .gamePrediction ?? {
        winner: '',
        projectedScore: { home: 0, away: 0 },
        winProbability: 0,
      }
      migrated.gameSummary.gamePrediction.winner =
        migrated.gameSummary.gamePrediction.winner ?? ''
      migrated.gameSummary.gamePrediction.projectedScore = migrated.gameSummary
        .gamePrediction.projectedScore ?? {
        home: 0,
        away: 0,
      }
      migrated.gameSummary.gamePrediction.projectedScore.home =
        migrated.gameSummary.gamePrediction.projectedScore.home ?? 0
      migrated.gameSummary.gamePrediction.projectedScore.away =
        migrated.gameSummary.gamePrediction.projectedScore.away ?? 0
      migrated.gameSummary.gamePrediction.winProbability =
        migrated.gameSummary.gamePrediction.winProbability ?? 0
    }

    // Ensure rosterDataUsed exists
    if (!migrated.rosterDataUsed) {
      migrated.rosterDataUsed = { home: [], away: [] }
    } else {
      migrated.rosterDataUsed.home = migrated.rosterDataUsed.home ?? []
      migrated.rosterDataUsed.away = migrated.rosterDataUsed.away ?? []
    }

    // Ensure combinedOdds exists
    if (migrated.combinedOdds == null) {
      migrated.combinedOdds = 0
    }

    // Ensure parlayConfidence exists
    if (migrated.parlayConfidence == null) {
      migrated.parlayConfidence = 0
    }

    // Ensure gameContext exists
    if (migrated.gameContext == null) {
      migrated.gameContext = ''
    }

    // Ensure gameId exists (best-effort)
    if (migrated.gameId == null) {
      migrated.gameId = ''
    }

    return migrated as GeneratedParlay
  }

  const parlaysQuery = query(
    collection(db, 'parlays'),
    where('userId', '==', userId),
    orderBy('savedAt', 'desc')
  )

  // onSnapshot returns an unsubscribe function that you can call
  // to detach the listener when the component unmounts.
  type FirestoreParlayDoc = GeneratedParlay & {
    userId: string
    savedAt: Timestamp
  }

  const unsubscribe = onSnapshot(
    parlaysQuery,
    querySnapshot => {
      const parlays: GeneratedParlay[] = querySnapshot.docs.map(docSnap => {
        const raw = docSnap.data() as FirestoreParlayDoc
        // Remove backend-only fields before migration
        const { userId: _userId, savedAt: _savedAt, ...rest } = raw
        // Migrate to current frontend schema and include Firestore doc ID
        return migrateParlay(rest, docSnap.id)
      })
      callback(parlays)
    },
    error => {
      console.error('Error fetching user parlays:', error)
      callback([])
    }
  )

  return unsubscribe
}
