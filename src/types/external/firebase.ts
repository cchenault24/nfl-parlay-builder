// ------------------------------------------------------------------------------------------------
// src/types/external/firebase.ts - Firebase-specific types
// ------------------------------------------------------------------------------------------------
export interface FirebaseUserProfile {
  displayName: string
  email: string
  photoURL?: string
  createdAt: Date | string // Firebase Timestamp or ISO string
  uid?: string
  savedParlays?: string[]
}

export interface FirebaseAdditionalUserData {
  [key: string]: string | number | boolean | string[] | Date
}
