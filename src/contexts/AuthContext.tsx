import { User } from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, createUserProfile, getUserProfile } from '../config/firebase'

interface UserProfile {
  displayName: string
  email: string
  photoURL?: string
  createdAt: any
}

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
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

          // Fetch the user profile
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile as UserProfile)
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
