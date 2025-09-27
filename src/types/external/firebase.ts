// ------------------------------------------------------------------------------------------------
// src/types/external/firebase.ts - Firebase-specific types
// ------------------------------------------------------------------------------------------------
export interface FirebaseUserProfile {
  displayName: string
  email: string
  photoURL?: string
  createdAt: any // Firebase Timestamp
  uid?: string
  savedParlays?: string[]
}

export interface FirebaseAdditionalUserData {
  [key: string]: unknown
}
