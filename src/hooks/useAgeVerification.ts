import {
  AGE_VERIFICATION_KEY,
  isVerified as recordIsVerified,
  newVerification,
} from '@shared/legal/ageVerification'
import { useEffect, useState } from 'react'

// The rule lives in shared/legal/ageVerification.ts. Only the storage backend
// differs from the iOS hook — localStorage here, AsyncStorage there — and the
// policy must not, because the two clients gate the same content for the same
// account.
export const useAgeVerification = () => {
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(AGE_VERIFICATION_KEY)
    } catch {
      // Storage disabled or unavailable fails closed, same as an unreadable
      // record.
      stored = null
    }
    const ok = recordIsVerified(stored)
    if (!ok && stored) {
      localStorage.removeItem(AGE_VERIFICATION_KEY)
    }
    setIsVerified(ok)
    setIsLoading(false)
  }, [])

  const setVerified = () => {
    localStorage.setItem(AGE_VERIFICATION_KEY, JSON.stringify(newVerification()))
    setIsVerified(true)
  }

  const clearVerification = () => {
    localStorage.removeItem(AGE_VERIFICATION_KEY)
    setIsVerified(false)
  }

  return {
    isVerified,
    isLoading,
    setVerified,
    clearVerification,
  }
}
