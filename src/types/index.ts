import { Timestamp } from 'firebase/firestore'

// Domain types live in `shared/` so the mobile client compiles the same
// definitions. Re-exported here so existing `../types` imports keep working.
export * from '@shared/types'

// ===== AUTH =====
// Web/mobile-specific: depends on the Firestore SDK's Timestamp, which
// `shared/` deliberately stays free of.
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[]
}
