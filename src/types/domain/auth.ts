import { BaseEntity } from '../core/common'

// ------------------------------------------------------------------------------------------------
// Authentication types
// ------------------------------------------------------------------------------------------------

export interface UserProfile extends BaseEntity {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  savedParlays?: string[]
}

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}
