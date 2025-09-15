import { User } from 'firebase/auth'
import { createContext } from 'react'
import type { UserProfile } from '../../config/firebase'

export interface AuthContextType {
  user: User | null | undefined
  userProfile: UserProfile | null
  loading: boolean
  error: Error | undefined
}

export const AuthContext = createContext<AuthContextType>({
  user: undefined,
  userProfile: null,
  loading: true,
  error: undefined,
})
