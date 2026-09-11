import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  AGE_VERIFICATION_KEY,
  isVerified as recordIsVerified,
  newVerification,
} from '@shared/legal/ageVerification'
import { useCallback, useEffect, useState } from 'react'

/**
 * Mirrors the web hook, but backed by AsyncStorage rather than
 * localStorage, and async — so `isLoading` genuinely matters here and the
 * gate must not render until it resolves.
 *
 * The rule itself lives in shared/legal/ageVerification.ts: the storage
 * backends differ, the policy must not.
 */
export function useAgeVerification() {
  const [verified, setVerifiedState] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let stored: string | null = null
      try {
        stored = await AsyncStorage.getItem(AGE_VERIFICATION_KEY)
      } catch {
        // Unreadable storage fails closed, same as an unreadable record — an
        // unverified user is the safe default for an age gate.
        stored = null
      }
      if (cancelled) {
        return
      }
      const ok = recordIsVerified(stored)
      if (!ok && stored) {
        // Expired or unusable; drop it rather than re-reading it every launch.
        await AsyncStorage.removeItem(AGE_VERIFICATION_KEY).catch(() => undefined)
      }
      if (!cancelled) {
        setVerifiedState(ok)
        setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setVerified = useCallback(async () => {
    await AsyncStorage.setItem(
      AGE_VERIFICATION_KEY,
      JSON.stringify(newVerification())
    )
    setVerifiedState(true)
  }, [])

  return { isVerified: verified, isLoading, setVerified }
}
