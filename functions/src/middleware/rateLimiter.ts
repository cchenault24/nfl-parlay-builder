import * as admin from 'firebase-admin'
import { CloudFunctionError } from '../types'

export interface RateLimitConfig {
  windowMinutes: number
  maxRequests: number
  cleanupAfterHours?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  currentCount: number
}

export interface RateLimitData {
  count: number
  windowStart: admin.firestore.Timestamp
  lastRequest: admin.firestore.Timestamp
  userId?: string
  ipAddress?: string
}

/**
 * Advanced Rate Limiter with Firestore backend
 * Supports both authenticated users and anonymous IP-based limiting
 */
export class RateLimiter {
  private firestore: admin.firestore.Firestore
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.firestore = admin.firestore()
    this.config = {
      cleanupAfterHours: 24, // Default cleanup after 24 hours
      ...config,
    }
  }

  /**
   * Check if request is allowed and update rate limit counters
   */
  async checkRateLimit(
    userId?: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    if (!userId && !ipAddress) {
      throw new CloudFunctionError(
        'INVALID_IDENTIFIER',
        'Either userId or ipAddress must be provided'
      )
    }

    const identifier = userId || ipAddress!
    const identifierType = userId ? 'user' : 'ip'
    const docRef = this.firestore
      .collection('rateLimits')
      .doc(`${identifierType}_${identifier}`)

    try {
      // Use transaction to prevent race conditions
      const result = await this.firestore.runTransaction(async transaction => {
        const doc = await transaction.get(docRef)
        const now = admin.firestore.Timestamp.now()
        const windowStartTime = new Date(
          now.toDate().getTime() - this.config.windowMinutes * 60 * 1000
        )

        let rateLimitData: RateLimitData

        if (!doc.exists) {
          // First request - create new rate limit entry
          rateLimitData = {
            count: 1,
            windowStart: now,
            lastRequest: now,
            ...(userId ? { userId } : { ipAddress }),
          }
          transaction.set(docRef, rateLimitData)
        } else {
          const existingData = doc.data() as RateLimitData
          const windowStart = existingData.windowStart.toDate()

          if (windowStart < windowStartTime) {
            // Window expired - reset counter
            rateLimitData = {
              count: 1,
              windowStart: now,
              lastRequest: now,
              ...(userId ? { userId } : { ipAddress }),
            }
            transaction.set(docRef, rateLimitData)
          } else {
            // Within current window - increment counter
            const newCount = existingData.count + 1
            rateLimitData = {
              ...existingData,
              count: newCount,
              lastRequest: now,
            }
            transaction.update(docRef, {
              count: newCount,
              lastRequest: now,
            })
          }
        }

        // Calculate result
        const allowed = rateLimitData.count <= this.config.maxRequests
        const remaining = Math.max(
          0,
          this.config.maxRequests - rateLimitData.count
        )
        const resetTime = new Date(
          rateLimitData.windowStart.toDate().getTime() +
            this.config.windowMinutes * 60 * 1000
        )

        return {
          allowed,
          remaining,
          resetTime,
          currentCount: rateLimitData.count,
        }
      })

      // Log rate limit activity (but not in excessive detail to avoid spam)
      if (!result.allowed) {
        console.warn(
          `⚠️ Rate limit exceeded for ${identifierType}: ${identifier} ` +
            `(${result.currentCount}/${this.config.maxRequests})`
        )
      }

      return result
    } catch (error) {
      console.error('❌ Rate limiter transaction failed:', error)
      // In case of Firestore errors, we fail open (allow the request)
      // This prevents rate limiter issues from blocking all requests
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: new Date(Date.now() + this.config.windowMinutes * 60 * 1000),
        currentCount: 0,
      }
    }
  }

  /**
   * Get current rate limit status without incrementing counter
   */
  async getRateLimitStatus(
    userId?: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    if (!userId && !ipAddress) {
      throw new CloudFunctionError(
        'INVALID_IDENTIFIER',
        'Either userId or ipAddress must be provided'
      )
    }

    const identifier = userId || ipAddress!
    const identifierType = userId ? 'user' : 'ip'
    const docRef = this.firestore
      .collection('rateLimits')
      .doc(`${identifierType}_${identifier}`)

    try {
      const doc = await docRef.get()
      const now = new Date()
      const windowStartTime = new Date(
        now.getTime() - this.config.windowMinutes * 60 * 1000
      )

      if (!doc.exists) {
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetTime: new Date(
            now.getTime() + this.config.windowMinutes * 60 * 1000
          ),
          currentCount: 0,
        }
      }

      const data = doc.data() as RateLimitData
      const windowStart = data.windowStart.toDate()

      if (windowStart < windowStartTime) {
        // Window expired
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetTime: new Date(
            now.getTime() + this.config.windowMinutes * 60 * 1000
          ),
          currentCount: 0,
        }
      }

      const allowed = data.count < this.config.maxRequests
      const remaining = Math.max(0, this.config.maxRequests - data.count)
      const resetTime = new Date(
        windowStart.getTime() + this.config.windowMinutes * 60 * 1000
      )

      return {
        allowed,
        remaining,
        resetTime,
        currentCount: data.count,
      }
    } catch (error) {
      console.error('❌ Failed to get rate limit status:', error)
      // Fail open
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: new Date(Date.now() + this.config.windowMinutes * 60 * 1000),
        currentCount: 0,
      }
    }
  }

  /**
   * Clean up expired rate limit entries
   * Should be called periodically (e.g., via scheduled function)
   */
  async cleanupExpiredEntries(): Promise<{ deletedCount: number }> {
    try {
      const cutoffTime = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - this.config.cleanupAfterHours! * 60 * 60 * 1000)
      )

      const expiredQuery = this.firestore
        .collection('rateLimits')
        .where('lastRequest', '<', cutoffTime)
        .limit(500) // Process in batches to avoid timeouts

      const snapshot = await expiredQuery.get()

      if (snapshot.empty) {
        return { deletedCount: 0 }
      }

      const batch = this.firestore.batch()
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })

      await batch.commit()

      console.log(`🧹 Cleaned up ${snapshot.size} expired rate limit entries`)
      return { deletedCount: snapshot.size }
    } catch (error) {
      console.error('❌ Failed to cleanup expired entries:', error)
      return { deletedCount: 0 }
    }
  }
}

/**
 * Extract client IP address from request
 * Handles various proxy headers and Firebase Functions specifics
 */
export function getClientIpAddress(request: any): string {
  // Try various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ]

  for (const header of headers) {
    const value = request.headers[header]
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }

  // Fallback to connection remote address
  return (
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    'unknown'
  )
}
