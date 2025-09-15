import { User } from 'firebase/auth'
import { useContext } from 'react'
import type { UserProfile } from '../config/firebase'
import { AuthContext } from '../contexts/authentication/auth'

export interface AuthContextType {
  user: User | null | undefined
  userProfile: UserProfile | null
  loading: boolean
  error: Error | undefined
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
