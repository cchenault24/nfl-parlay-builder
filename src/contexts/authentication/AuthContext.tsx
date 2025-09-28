import React, { useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  auth,
  createUserProfile,
  getUserProfile,
  UserProfile,
} from '../../config/firebase'
import { AuthContext } from './auth'

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
          await createUserProfile(user)
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile)
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error setting up user profile:', error)
          }
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

export default AuthProvider
