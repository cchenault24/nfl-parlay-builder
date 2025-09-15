import { User } from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  auth,
  createUserProfile,
  getUserProfile,
  UserProfile,
} from '../config/firebase'

interface AuthContextType {
  user: User | null | undefined
  userProfile: UserProfile | null
  loading: boolean
  error: Error | undefined
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  userProfile: null,
  loading: true,
  error: undefined,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, loading, error] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    const setupUserProfile = async () => {
      if (user) {
        setProfileLoading(true)
        try {
          // Create profile if it doesn't exist
          await createUserProfile(user)

          // Fetch the user profile - no casting needed now!
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile) // profile is already UserProfile | null
        } catch (error) {
          console.error('Error setting up user profile:', error)
        } finally {
          setProfileLoading(false)
        }
      } else {
        setUserProfile(null)
      }
    }

    setupUserProfile()
  }, [user])

  const value = {
    user,
    userProfile,
    loading: loading || profileLoading,
    error,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider } // Export at bottom instead of inline
