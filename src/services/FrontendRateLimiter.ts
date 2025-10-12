interface RateLimitInfo {
  remaining: number
  total: number
  resetTime: Date
  currentCount: number
}

interface RateLimitRecord {
  count: number
  windowStart: number
}

/**
 * Frontend rate limiter that works independently of API calls
 * Tracks rate limits in localStorage and works for both mock and real data
 *
 * Rate limiting strategies:
 * - 'global': Rate limit applies to all users on this device (persists across logouts)
 * - 'user': Rate limit is per-user but persists across logouts for security
 * - 'session': Rate limit resets on logout (better UX, industry standard)
 */
export class FrontendRateLimiter {
  private static readonly STORAGE_KEY_PREFIX = 'nfl-parlay-rate-limit'
  private static readonly DEFAULT_LIMIT = 20
  private static readonly DEFAULT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
  private static readonly STRATEGY: 'global' | 'user' | 'session' = 'session' // Default strategy

  /**
   * Check if a request is allowed and increment the counter
   */
  static async checkAndIncrement(
    limit: number = this.DEFAULT_LIMIT,
    windowMs: number = this.DEFAULT_WINDOW_MS,
    userId?: string | null
  ): Promise<{ allowed: boolean; rateLimitInfo: RateLimitInfo }> {
    const now = Date.now()
    const key = this.getStorageKey(userId)
    const record = this.getRecord(key)

    let updatedRecord: RateLimitRecord

    if (!record) {
      // First request in this window
      updatedRecord = { count: 1, windowStart: now }
    } else if (now - record.windowStart >= windowMs) {
      // Window has expired, reset
      updatedRecord = { count: 1, windowStart: now }
    } else if (record.count >= limit) {
      // Rate limit exceeded
      return {
        allowed: false,
        rateLimitInfo: {
          remaining: 0,
          total: limit,
          resetTime: new Date(record.windowStart + windowMs),
          currentCount: record.count,
        },
      }
    } else {
      // Increment counter
      updatedRecord = {
        count: record.count + 1,
        windowStart: record.windowStart,
      }
    }

    // Save updated record
    this.setRecord(key, updatedRecord)

    const remaining = Math.max(0, limit - updatedRecord.count)
    const resetTime = new Date(updatedRecord.windowStart + windowMs)

    return {
      allowed: true,
      rateLimitInfo: {
        remaining,
        total: limit,
        resetTime,
        currentCount: updatedRecord.count,
      },
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  static getCurrentStatus(
    limit: number = this.DEFAULT_LIMIT,
    windowMs: number = this.DEFAULT_WINDOW_MS,
    userId?: string | null
  ): RateLimitInfo {
    const now = Date.now()
    const key = this.getStorageKey(userId)
    const record = this.getRecord(key)

    if (!record) {
      return {
        remaining: limit,
        total: limit,
        resetTime: new Date(now + windowMs),
        currentCount: 0,
      }
    }

    if (now - record.windowStart >= windowMs) {
      // Window has expired
      return {
        remaining: limit,
        total: limit,
        resetTime: new Date(now + windowMs),
        currentCount: 0,
      }
    }

    const remaining = Math.max(0, limit - record.count)
    const resetTime = new Date(record.windowStart + windowMs)

    return {
      remaining,
      total: limit,
      resetTime,
      currentCount: record.count,
    }
  }

  /**
   * Reset rate limit (for testing or admin purposes)
   */
  static reset(userId?: string | null): void {
    const key = this.getStorageKey(userId)
    localStorage.removeItem(key)
  }

  /**
   * Clear all rate limit data (for logout or admin purposes)
   */
  static clearAll(): void {
    // Clear all rate limit keys
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Get storage key based on strategy and user ID
   */
  private static getStorageKey(userId?: string | null): string {
    switch (this.STRATEGY) {
      case 'global':
        return this.STORAGE_KEY_PREFIX
      case 'user':
        return userId
          ? `${this.STORAGE_KEY_PREFIX}-user-${userId}`
          : this.STORAGE_KEY_PREFIX
      case 'session':
        return userId
          ? `${this.STORAGE_KEY_PREFIX}-session-${userId}`
          : this.STORAGE_KEY_PREFIX
      default:
        return this.STORAGE_KEY_PREFIX
    }
  }

  /**
   * Get rate limit record from localStorage
   */
  private static getRecord(key: string): RateLimitRecord | null {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null
      return JSON.parse(stored) as RateLimitRecord
    } catch {
      return null
    }
  }

  /**
   * Set rate limit record in localStorage
   */
  private static setRecord(key: string, record: RateLimitRecord): void {
    try {
      localStorage.setItem(key, JSON.stringify(record))
    } catch (error) {
      console.warn('Failed to save rate limit record:', error)
    }
  }
}
