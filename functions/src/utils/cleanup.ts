import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { RateLimiter } from '../middleware/rateLimiter'

/**
 * Scheduled function to clean up expired rate limit entries
 * Runs every 6 hours to prevent Firestore bloat
 */
export const cleanupRateLimits = onSchedule({
  schedule: 'every 6 hours',
  timeZone: 'America/New_York',
  region: 'us-central1',
}, async (event) => {
  try {
    // Initialize rate limiter with same config as main function
    const rateLimiter = new RateLimiter({
      windowMinutes: 60, // 1 hour window
      maxRequests: 10, // 10 requests per hour
      cleanupAfterHours: 24, // Clean up entries older than 24 hours
    })

    const result = await rateLimiter.cleanupExpiredEntries()
    console.log('✅ Rate limit cleanup completed:', {
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Rate limit cleanup failed:', error)
  }
})

/**
 * Manual cleanup function that can be called via HTTP
 * Useful for testing or manual maintenance
 */
export const manualCleanupRateLimits = onRequest({
  region: 'us-central1',
  timeoutSeconds: 120,
  memory: '256MiB',
}, async (request, response) => {
    // Simple authentication check
    const authHeader = request.headers.authorization
    const expectedToken = process.env.CLEANUP_TOKEN || 'cleanup-secret-token'

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      response.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
      return
    }

    try {
      const rateLimiter = new RateLimiter({
        windowMinutes: 60,
        maxRequests: 10,
        cleanupAfterHours: 24,
      })

      const result = await rateLimiter.cleanupExpiredEntries()

      response.status(200).json({
        success: true,
        deletedCount: result.deletedCount,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error)

      response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    }
  })
