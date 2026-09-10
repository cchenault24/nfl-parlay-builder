import type { User } from '@firebase/auth'
import { createContext, useEffect, useState, type ReactNode } from 'react'

import {
  createUserProfile,
  getUserProfile,
  onAuthUserChanged,
  type UserProfile,
} from '@/lib/firebase'

export interface AuthContextValue {
  // `undefined` means the first auth state has not arrived yet; `null` means
  // resolved and signed out. The gate depends on telling those apart.
  user: User | null | undefined
  userProfile: UserProfile | null
  loading: boolean
  error: Error | undefined
}

export const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  userProfile: null,
  loading: true,
  error: undefined,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  // Keyed by uid rather than stored bare: AuthProvider outlives a sign-out, so
  // a bare profile would still be in state when the next user signs in and the
  // account screen would show them the previous user's name and photo until the
  // fetch landed. Keying also means the signed-out case needs no write at all.
  const [loaded, setLoaded] = useState<{ uid: string; profile: UserProfile | null }>()
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)

  useEffect(() => onAuthUserChanged(setUser), [])

  useEffect(() => {
    // Still waiting on the first auth state — nothing to do yet.
    if (user === undefined) {
      return
    }
    if (!user) {
      return
    }

    let cancelled = false
    ;(async () => {
      setProfileLoading(true)
      try {
        await createUserProfile(user)
        const profile = await getUserProfile(user.uid)
        if (!cancelled) {
          setLoaded({ uid: user.uid, profile })
          setError(undefined)
        }
      } catch (err) {
        // Surfaced rather than retried: a failed profile write means the
        // Firestore rules or the network are wrong, and silently retrying
        // would hide that.
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile: user && loaded?.uid === user.uid ? loaded.profile : null,
        loading: user === undefined || profileLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
