import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { RateLimiter, getClientIpAddress } from './middleware/rateLimiter'
import { ContextBuilder } from './service/ai/ContextBuilder'
import { ParlayAIService } from './service/ai/ParlayAIService'
import { OpenAIProvider } from './service/ai/providers/OpenAIProvider'
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
    'https://nfl-parlay-builder.web.app',
    'https://nfl-parlay-builder.firebaseapp.com',
    /^https:\/\/nfl-parlay-builder--[\w-]+\.web\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// Rate limiter instance
const rateLimiter = new RateLimiter({
  windowMinutes: 60,
  maxRequests: 10,
  cleanupAfterHours: 24,
})

/**
 * Validate generate parlay request
 */
function validateGenerateParlayRequest(body: any): ValidationResult {
  const errors: string[] = []

  if (!body.game) {
    errors.push('Game data is required')
  } else {
    if (!body.game.homeTeam || !body.game.awayTeam) {
      errors.push('Both home and away teams are required')
    }
    if (!body.game.week || typeof body.game.week !== 'number') {
      errors.push('Valid game week is required')
    }
  }

  if (!body.rosters) {
    errors.push('Roster data is required')
  } else {
    if (!body.rosters.homeRoster || !Array.isArray(body.rosters.homeRoster)) {
      errors.push('Valid home roster is required')
    }
    if (!body.rosters.awayRoster || !Array.isArray(body.rosters.awayRoster)) {
      errors.push('Valid away roster is required')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Initialize AI service with provider architecture
 */
function initializeAIService(): ParlayAIService {
  const parlayAI = new ParlayAIService({
    primaryProvider: 'openai',
    fallbackProviders: ['anthropic'],
    enableFallback: true,
    debugMode: process.env.NODE_ENV === 'development',
  })

  // Register OpenAI provider if API key is available
  if (process.env.OPENAI_API_KEY) {
    const openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
      defaultMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
    })
    parlayAI.registerProvider('openai', openaiProvider)
  }

  // Future providers can be registered here
  // if (process.env.ANTHROPIC_API_KEY) {
  //   parlayAI.registerProvider('anthropic', new AnthropicProvider({...}))
  // }

  return parlayAI
}

/**
 * Cloud Function: Generate NFL Parlay
 */
export const generateParlay = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {
      try {
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

        // Rate limiting
        const userId = request.headers['x-user-id'] as string
        const ipAddress = getClientIpAddress(request)

        const rateLimitResult = await rateLimiter.checkRateLimit(
          userId,
          ipAddress
        )

        if (!rateLimitResult.allowed) {
          console.log(
            `Rate limit exceeded for ${userId ? `user ${userId}` : `IP ${ipAddress}`}`
          )

          response.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded. You have used ${rateLimitResult.currentCount} of 10 requests this hour.`,
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

        // Validate request
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

        // Validate rosters
        if (
          !requestData.rosters?.homeRoster?.length ||
          !requestData.rosters?.awayRoster?.length
        ) {
          throw new CloudFunctionError(
            'INSUFFICIENT_ROSTERS',
            'Complete roster data is required for both teams'
          )
        }

        // Initialize AI service
        const aiService = initializeAIService()

        // Build context for AI generation
        const strategy = requestData.strategy || {
          name: 'Balanced Analysis',
          description: 'Well-rounded approach to parlay generation',
          temperature: 0.7,
          focusAreas: ['recent_form', 'matchup_analysis'],
          riskLevel: 'moderate' as const,
        }

        const varietyFactors = requestData.varietyFactors || {
          strategy: 'balanced',
          focusArea: 'balanced',
          playerTier: 'star',
          gameScript: 'close_game',
          marketBias: 'neutral',
          riskTolerance: 0.6,
          focusPlayer: null,
        }

        const context = ContextBuilder.buildContext(
          requestData.game,
          requestData.rosters,
          strategy,
          varietyFactors
        )

        // Add temperature from options if provided
        if (requestData.options?.temperature) {
          context.temperature = requestData.options.temperature
        }

        console.log(
          `Generating parlay for ${requestData.game.awayTeam.displayName} @ ${requestData.game.homeTeam.displayName}`
        )

        // Generate parlay using AI service
        const result = await aiService.generateParlay(
          requestData.game,
          requestData.rosters,
          strategy,
          varietyFactors,
          {
            provider: requestData.options?.provider,
            temperature: requestData.options?.temperature,
            debugMode: process.env.NODE_ENV === 'development',
          }
        )

        console.log(
          `Successfully generated parlay with ${result.metadata?.provider} provider`
        )

        // Return successful response
        const successResponse: GenerateParlayResponse = {
          success: true,
          data: result.parlay,
          rateLimitInfo: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime.toISOString(),
            currentCount: rateLimitResult.currentCount,
            total: 10,
          },
          metadata: {
            provider: result.metadata?.provider || 'openai',
            generatedAt: new Date().toISOString(),
            rateLimitInfo: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime.toISOString(),
            },
            // Include additional AI metadata as extra properties
            ...(result.metadata && {
              aiProvider: result.metadata.provider,
              model: result.metadata.model,
              tokens: result.metadata.tokens,
              latency: result.metadata.latency,
              confidence: result.metadata.confidence,
              fallbackUsed: result.metadata.fallbackUsed,
              attemptCount: result.metadata.attemptCount,
            }),
          },
        }

        response.status(200).json(successResponse)
      } catch (error) {
        console.error('Error in generateParlay function:', error)

        if (error instanceof CloudFunctionError) {
          const statusCode = getStatusCodeForError(error.code)
          response.status(statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          })
          return
        }

        response.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred while generating the parlay',
            details:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
        })
      }
    })
  })

/**
 * Get appropriate HTTP status code for errors
 */
function getStatusCodeForError(errorCode: string): number {
  const statusCodes: Record<string, number> = {
    INVALID_REQUEST: 400,
    MISSING_ROSTERS: 400,
    INSUFFICIENT_ROSTERS: 400,
    MISSING_API_KEY: 500,
    MISSING_CONFIG: 500,
    OPENAI_ERROR: 503,
    PROVIDER_NOT_AVAILABLE: 503,
    GENERATION_FAILED: 500,
    PARSE_ERROR: 500,
    NO_RESPONSE: 500,
    RATE_LIMIT_EXCEEDED: 429,
  }
  return statusCodes[errorCode] || 500
}

/**
 * Health check endpoint
 */
export const healthCheck = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        const aiService = initializeAIService()
        const serviceStatus = aiService.getServiceStatus()

        response.status(200).json({
          success: true,
          data: {
            status: serviceStatus.healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            service: serviceStatus,
            version: process.env.npm_package_version || '1.0.0',
          },
        })
      } catch (error: any) {
        console.error('Health check failed:', error)
        response.status(503).json({
          success: false,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message,
        })
      }
    })
  }
)

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

        // Implementation here...
      } catch (error) {
        // Error handling...
      }
    })
  })

// Import cleanup functions from utils
export { cleanupRateLimits, manualCleanupRateLimits } from './utils/cleanup'
