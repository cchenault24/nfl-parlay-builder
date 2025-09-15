import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { RateLimiter, getClientIpAddress } from './middleware/rateLimiter'
import { OpenAIService } from './service/openaiService'
import {
  CloudFunctionError,
  GenerateParlayRequest,
  GenerateParlayResponse,
  ValidationResult,
} from './types'

// Initialize Firebase Admin
admin.initializeApp()

// Configure CORS for your frontend domain
const corsHandler = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://nfl-parlay-builder.web.app', // Main production domain
    'https://nfl-parlay-builder.firebaseapp.com', // Alternative domain
    /^https:\/\/nfl-parlay-builder--.*\.web\.app$/, // Preview deployments
  ],
  credentials: true,
  methods: ['POST', 'OPTIONS', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// Initialize rate limiter
const rateLimiter = new RateLimiter({
  windowMinutes: 60, // 1 hour window
  maxRequests: 10, // 10 requests per hour
  cleanupAfterHours: 24,
})

/**
 * Generate Parlay Cloud Function with Rate Limiting
 * Securely handles OpenAI API calls on the server side
 */
export const generateParlay = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB',
    secrets: ['OPENAI_API_KEY'],
  })
  .https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {
      // Security headers
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.setHeader('X-Frame-Options', 'DENY')
      response.setHeader('X-XSS-Protection', '1; mode=block')

      try {
        // Only allow POST requests
        if (request.method !== 'POST') {
          response.status(405).json({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Only POST requests are allowed',
            },
          })
          return
        }

        // Extract user identifier for rate limiting
        const authHeader = request.headers.authorization
        let userId: string | undefined
        let ipAddress: string

        // Try to get user ID from auth token
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7)
            const decodedToken = await admin.auth().verifyIdToken(token)
            userId = decodedToken.uid
          } catch (authError) {
            console.warn(
              '⚠️ Invalid auth token, falling back to IP-based limiting'
            )
          }
        }

        // Get IP address for rate limiting
        ipAddress = getClientIpAddress(request)

        // Check rate limit BEFORE processing request
        const rateLimitResult = await rateLimiter.checkRateLimit(
          userId,
          ipAddress
        )

        // Add rate limit headers to response
        response.setHeader('X-RateLimit-Limit', '10')
        response.setHeader(
          'X-RateLimit-Remaining',
          rateLimitResult.remaining.toString()
        )
        response.setHeader(
          'X-RateLimit-Reset',
          rateLimitResult.resetTime.toISOString()
        )

        if (!rateLimitResult.allowed) {
          console.warn(
            `🚫 Rate limit exceeded for ${userId ? `user ${userId}` : `IP ${ipAddress}`}`
          )

          response.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded. You have used ${rateLimitResult.currentCount} of 10 requests this hour. Limit resets at ${rateLimitResult.resetTime.toISOString()}.`,
              details: {
                remaining: rateLimitResult.remaining,
                resetTime: rateLimitResult.resetTime.toISOString(),
                currentCount: rateLimitResult.currentCount,
                total: 10,
              },
            },
          })
          return
        }

        // Validate request body
        const validation = validateGenerateParlayRequest(request.body)
        if (!validation.isValid) {
          response.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid request data',
              details: validation.errors,
            },
          })
          return
        }

        const requestData: GenerateParlayRequest = request.body

        // Use rosters from client request (Option 2)
        const rosters = requestData.rosters

        // Validate rosters
        if (!rosters || !rosters.homeRoster || !rosters.awayRoster) {
          throw new CloudFunctionError(
            'MISSING_ROSTERS',
            'Roster data is required but not provided'
          )
        }

        if (
          rosters.homeRoster.length === 0 ||
          rosters.awayRoster.length === 0
        ) {
          throw new CloudFunctionError(
            'INSUFFICIENT_ROSTERS',
            'Insufficient roster data to generate parlay'
          )
        }

        // Get OpenAI API key from Firebase config
        const openaiApiKey = process.env.OPENAI_API_KEY
        if (!openaiApiKey) {
          throw new CloudFunctionError(
            'MISSING_CONFIG',
            'OpenAI API key not configured'
          )
        }

        // Initialize OpenAI service
        const openaiService = new OpenAIService(openaiApiKey)

        // Generate parlay
        const parlay = await openaiService.generateParlay(
          requestData.game,
          rosters,
          requestData.options
        )

        // Return success response with rate limit info
        const successResponse: GenerateParlayResponse = {
          success: true,
          data: parlay,
          rateLimitInfo: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime.toISOString(),
            currentCount: rateLimitResult.currentCount,
            total: 10,
          },
        }

        response.status(200).json(successResponse)
      } catch (error) {
        console.error('❌ Error in generateParlay function:', error)

        let errorResponse: GenerateParlayResponse

        if (error instanceof CloudFunctionError) {
          errorResponse = {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          }
        } else {
          // Don't expose internal errors to client
          errorResponse = {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
          }
        }

        // Determine appropriate HTTP status code
        const statusCode = getStatusCodeFromError(error)
        response.status(statusCode).json(errorResponse)
      }
    })
  })

/**
 * Get Rate Limit Status endpoint
 * Allows frontend to check current rate limit without making a request
 */
export const getRateLimitStatus = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 10,
    memory: '256MB',
  })
  .https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        if (request.method !== 'GET') {
          response.status(405).json({
            success: false,
            error: 'Only GET requests are allowed',
          })
          return
        }

        // Extract user identifier
        const authHeader = request.headers.authorization
        let userId: string | undefined
        let ipAddress: string

        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7)
            const decodedToken = await admin.auth().verifyIdToken(token)
            userId = decodedToken.uid
          } catch (authError) {
            // Ignore auth errors for status check
          }
        }

        ipAddress = getClientIpAddress(request)

        // Get rate limit status without incrementing
        const rateLimitResult = await rateLimiter.getRateLimitStatus(
          userId,
          ipAddress
        )

        response.status(200).json({
          success: true,
          data: {
            remaining: rateLimitResult.remaining,
            total: 10, // Hard-coded for now, could be configurable
            resetTime: rateLimitResult.resetTime.toISOString(),
            currentCount: rateLimitResult.currentCount,
          },
        })
      } catch (error) {
        console.error('❌ Error getting rate limit status:', error)
        response.status(500).json({
          success: false,
          error: 'Failed to get rate limit status',
        })
      }
    })
  })

/**
 * Health check endpoint for monitoring
 */
export const healthCheck = functions
  .region('us-central1')
  .https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        // Basic health check
        const timestamp = new Date().toISOString()

        // Optional: Test OpenAI connection
        let openaiStatus = 'unknown'
        try {
          const openaiApiKey = process.env.OPENAI_API_KEY
          if (openaiApiKey) {
            const openaiService = new OpenAIService(openaiApiKey)
            const isConnected = await openaiService.validateConnection()
            openaiStatus = isConnected ? 'connected' : 'failed'
          }
        } catch {
          openaiStatus = 'failed'
        }

        response.status(200).json({
          status: 'healthy',
          timestamp,
          services: {
            openai: openaiStatus,
            firebase: 'connected',
            rateLimiting: 'active',
          },
          version: '1.0.0',
        })
      } catch (error) {
        response.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
      }
    })
  })

// Import cleanup functions from utils
export { cleanupRateLimits, manualCleanupRateLimits } from './utils/cleanup'

// Helper functions
function validateGenerateParlayRequest(body: any): ValidationResult {
  const errors: string[] = []

  if (!body) {
    errors.push('Request body is required')
    return { isValid: false, errors }
  }

  if (!body.game) {
    errors.push('Game data is required')
  }

  if (!body.rosters) {
    errors.push('Roster data is required')
  }

  if (body.rosters && (!body.rosters.homeRoster || !body.rosters.awayRoster)) {
    errors.push('Both home and away roster data is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

function getStatusCodeFromError(error: any): number {
  if (error instanceof CloudFunctionError) {
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        return 429
      case 'INVALID_REQUEST':
      case 'MISSING_ROSTERS':
      case 'INSUFFICIENT_ROSTERS':
        return 400
      case 'MISSING_CONFIG':
        return 500
      default:
        return 500
    }
  }
  return 500
}
