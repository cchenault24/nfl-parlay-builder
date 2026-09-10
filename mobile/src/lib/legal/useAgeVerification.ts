import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'

const KEY = 'nfl-parlay-age-verified'
const EXPIRY_DAYS = 30

interface StoredVerification {
  verified: boolean
  timestamp: number
}

/**
 * Mirrors the web hook, but backed by AsyncStorage rather than
 * localStorage, and async — so `isLoading` genuinely matters here and the
 * gate must not render until it resolves.
 */
export function useAgeVerification() {
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY)
        if (cancelled) {
          return
        }
        if (!stored) {
          setIsVerified(false)
          return
        }
        const data = JSON.parse(stored) as StoredVerification
        const days = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24)
        if (data.verified && days < EXPIRY_DAYS) {
          setIsVerified(true)
        } else {
          await AsyncStorage.removeItem(KEY)
          setIsVerified(false)
        }
      } catch {
        // A corrupt or unreadable record must fail closed — an unverified
        // user is the safe default for an age gate.
        if (!cancelled) {
          setIsVerified(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setVerified = useCallback(async () => {
    const data: StoredVerification = { verified: true, timestamp: Date.now() }
    await AsyncStorage.setItem(KEY, JSON.stringify(data))
    setIsVerified(true)
  }, [])

  return { isVerified, isLoading, setVerified }
}
