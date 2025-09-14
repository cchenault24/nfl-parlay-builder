import * as functions from 'firebase-functions'
import { RateLimiter } from '../middleware/rateLimiter'

/**
 * Scheduled function to clean up expired rate limit entries
 * Runs every 6 hours to prevent Firestore bloat
 */
export const cleanupRateLimits = functions
  .region('us-central1')
  .pubsub.schedule('every 6 hours')
  .timeZone('America/New_York') // Adjust to your timezone
  .onRun(async context => {
    console.log('🧹 Starting rate limit cleanup...')

    try {
      // Initialize rate limiter with same config as main function
      const rateLimiter = new RateLimiter({
        windowMinutes: 60, // 1 hour window
        maxRequests: 10, // 10 requests per hour
        cleanupAfterHours: 24, // Clean up entries older than 24 hours
      })

      const result = await rateLimiter.cleanupExpiredEntries()

      console.log(
        `✅ Rate limit cleanup completed. Deleted ${result.deletedCount} entries`
      )

      return {
        success: true,
        deletedCount: result.deletedCount,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('❌ Rate limit cleanup failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    }
  })

/**
 * Manual cleanup function that can be called via HTTP
 * Useful for testing or manual maintenance
 */
export const manualCleanupRateLimits = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 120,
    memory: '256MB',
  })
  .https.onRequest(async (request, response) => {
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
