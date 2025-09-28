import { useEffect, useState } from 'react'

const AGE_VERIFICATION_KEY = 'nfl-parlay-age-verified'
const VERIFICATION_EXPIRY_DAYS = 30 // Re-verify every 30 days

interface AgeVerificationData {
  verified: boolean
  timestamp: number
}

export const useAgeVerification = () => {
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    checkVerificationStatus()
  }, [])

  const checkVerificationStatus = () => {
    try {
      const stored = localStorage.getItem(AGE_VERIFICATION_KEY)
      if (!stored) {
        setIsVerified(false)
        setIsLoading(false)
        return
      }

      const data: AgeVerificationData = JSON.parse(stored)
      const now = Date.now()
      const daysSinceVerification =
        (now - data.timestamp) / (1000 * 60 * 60 * 24)

      if (data.verified && daysSinceVerification < VERIFICATION_EXPIRY_DAYS) {
        setIsVerified(true)
      } else {
        // Verification expired, remove old data
        localStorage.removeItem(AGE_VERIFICATION_KEY)
        setIsVerified(false)
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error checking age verification:', error)
      }
      setIsVerified(false)
    }
    setIsLoading(false)
  }

  const setVerified = () => {
    const data: AgeVerificationData = {
      verified: true,
      timestamp: Date.now(),
    }
    localStorage.setItem(AGE_VERIFICATION_KEY, JSON.stringify(data))
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
