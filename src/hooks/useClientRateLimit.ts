import { useCallback, useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../config/firebase'

export interface RateLimitInfo {
  remaining: number
  total: number
  currentCount: number
  resetTime: Date
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10, // Max requests per window
  windowMs: 60 * 60 * 1000, // 1 hour window
}

/**
 * Client-side rate limiting hook
 * Manages rate limiting state in localStorage with user-specific keys
 */
export const useClientRateLimit = () => {
  const [user] = useAuthState(auth)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    if (user?.uid) {
      return `rateLimit_user_${user.uid}`
    }
    // For anonymous users, use a combination of browser fingerprint and IP
    // This is a simple approach - in production you might want more sophisticated tracking
    return `rateLimit_anonymous_${navigator.userAgent.slice(0, 20)}`
  }, [user?.uid])

  // Load rate limit info from localStorage
  const loadRateLimitInfo = useCallback(() => {
    try {
      const storageKey = getStorageKey()
      const stored = localStorage.getItem(storageKey)

      if (!stored) {
        // No existing data, create new entry
        const now = Date.now()
        const resetTime = now + RATE_LIMIT_CONFIG.windowMs
        const newEntry: RateLimitEntry = {
          count: 0,
          resetTime,
        }
        localStorage.setItem(storageKey, JSON.stringify(newEntry))

        setRateLimitInfo({
          remaining: RATE_LIMIT_CONFIG.maxRequests,
          total: RATE_LIMIT_CONFIG.maxRequests,
          currentCount: 0,
          resetTime: new Date(resetTime),
        })
        return
      }

      const entry: RateLimitEntry = JSON.parse(stored)
      const now = Date.now()

      if (entry.resetTime < now) {
        // Window expired, reset
        const resetTime = now + RATE_LIMIT_CONFIG.windowMs
        const newEntry: RateLimitEntry = {
          count: 0,
          resetTime,
        }
        localStorage.setItem(storageKey, JSON.stringify(newEntry))

        setRateLimitInfo({
          remaining: RATE_LIMIT_CONFIG.maxRequests,
          total: RATE_LIMIT_CONFIG.maxRequests,
          currentCount: 0,
          resetTime: new Date(resetTime),
        })
      } else {
        // Within current window
        const remaining = Math.max(
          0,
          RATE_LIMIT_CONFIG.maxRequests - entry.count
        )
        setRateLimitInfo({
          remaining,
          total: RATE_LIMIT_CONFIG.maxRequests,
          currentCount: entry.count,
          resetTime: new Date(entry.resetTime),
        })
      }
    } catch (error) {
      console.error('Error loading rate limit info:', error)
      // Fallback to unlimited
      setRateLimitInfo({
        remaining: RATE_LIMIT_CONFIG.maxRequests,
        total: RATE_LIMIT_CONFIG.maxRequests,
        currentCount: 0,
        resetTime: new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs),
      })
    } finally {
      setIsLoading(false)
    }
  }, [getStorageKey])

  // Increment rate limit count
  const incrementRateLimit = useCallback(() => {
    try {
      const storageKey = getStorageKey()
      const stored = localStorage.getItem(storageKey)

      if (!stored) {
        // No existing data, create new entry
        const now = Date.now()
        const resetTime = now + RATE_LIMIT_CONFIG.windowMs
        const newEntry: RateLimitEntry = {
          count: 1,
          resetTime,
        }
        localStorage.setItem(storageKey, JSON.stringify(newEntry))

        setRateLimitInfo({
          remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
          total: RATE_LIMIT_CONFIG.maxRequests,
          currentCount: 1,
          resetTime: new Date(resetTime),
        })
        return true
      }

      const entry: RateLimitEntry = JSON.parse(stored)
      const now = Date.now()

      if (entry.resetTime < now) {
        // Window expired, reset and increment
        const resetTime = now + RATE_LIMIT_CONFIG.windowMs
        const newEntry: RateLimitEntry = {
          count: 1,
          resetTime,
        }
        localStorage.setItem(storageKey, JSON.stringify(newEntry))

        setRateLimitInfo({
          remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
          total: RATE_LIMIT_CONFIG.maxRequests,
          currentCount: 1,
          resetTime: new Date(resetTime),
        })
        return true
      }

      if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
        // Rate limit exceeded
        return false
      }

      // Increment count
      const newCount = entry.count + 1
      const updatedEntry: RateLimitEntry = {
        ...entry,
        count: newCount,
      }
      localStorage.setItem(storageKey, JSON.stringify(updatedEntry))

      const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - newCount)
      setRateLimitInfo({
        remaining,
        total: RATE_LIMIT_CONFIG.maxRequests,
        currentCount: newCount,
        resetTime: new Date(entry.resetTime),
      })

      return true
    } catch (error) {
      console.error('Error incrementing rate limit:', error)
      return false
    }
  }, [getStorageKey])

  // Check if request is allowed
  const canMakeRequest = useCallback(() => {
    return rateLimitInfo ? rateLimitInfo.remaining > 0 : false
  }, [rateLimitInfo])

  // Reset rate limit (for testing or admin purposes)
  const resetRateLimit = useCallback(() => {
    try {
      const storageKey = getStorageKey()
      localStorage.removeItem(storageKey)
      loadRateLimitInfo()
    } catch (error) {
      console.error('Error resetting rate limit:', error)
    }
  }, [getStorageKey, loadRateLimitInfo])

  // Load rate limit info when user changes
  useEffect(() => {
    loadRateLimitInfo()
  }, [loadRateLimitInfo])

  // Clean up expired entries periodically
  useEffect(() => {
    const cleanup = () => {
      try {
        const now = Date.now()
        const keys = Object.keys(localStorage)

        keys.forEach(key => {
          if (key.startsWith('rateLimit_')) {
            const stored = localStorage.getItem(key)
            if (stored) {
              const entry: RateLimitEntry = JSON.parse(stored)
              if (entry.resetTime < now) {
                localStorage.removeItem(key)
              }
            }
          }
        })
      } catch (error) {
        console.error('Error cleaning up expired rate limit entries:', error)
      }
    }

    // Clean up every 5 minutes
    const interval = setInterval(cleanup, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    rateLimitInfo,
    isLoading,
    canMakeRequest,
    incrementRateLimit,
    resetRateLimit,
    refetch: loadRateLimitInfo,
  }
}
