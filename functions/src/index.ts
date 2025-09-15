import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { RateLimiter, getClientIpAddress } from './middleware/rateLimiter'
import {
  ParlayAIService,
  type AIProviderConfigs,
} from './service/ai/ParlayAIService'
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
    /^https:\/\/nfl-parlay-builder--[\w-]+\.web\.app$/, // Preview URLs
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// Rate limiter instance with proper config
const rateLimiter = new RateLimiter({
  windowMinutes: 60, // 1 hour window
  maxRequests: 10, // 10 requests per hour
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
 * Initialize AI service with multiple provider support
 */
function initializeAIService(): ParlayAIService {
  const configs: AIProviderConfigs = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: (process.env.OPENAI_MODEL as any) || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
    },
    // Future providers can be added here
    // anthropic: {
    //   apiKey: process.env.ANTHROPIC_API_KEY || '',
    //   model: 'claude-3-sonnet',
    // },
    // google: {
    //   apiKey: process.env.GOOGLE_API_KEY || '',
    //   model: 'gemini-pro',
    // },
  }

  return new ParlayAIService(configs)
}

/**
 * Cloud Function: Generate NFL Parlay
 * Enhanced with multi-provider AI support and anti-template logic
 */
export const generateParlay = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .https.onRequest(async (request, response) => {
    // Handle CORS preflight
    corsHandler(request, response, async () => {
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

        // Get client identification for rate limiting
        const userId = request.headers['x-user-id'] as string
        const ipAddress = getClientIpAddress(request)

        // Apply rate limiting
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

        // Validate rosters
        if (
          !requestData.rosters ||
          !requestData.rosters.homeRoster ||
          !requestData.rosters.awayRoster
        ) {
          throw new CloudFunctionError(
            'MISSING_ROSTERS',
            'Roster data is required but not provided'
          )
        }

        if (
          requestData.rosters.homeRoster.length === 0 ||
          requestData.rosters.awayRoster.length === 0
        ) {
          throw new CloudFunctionError(
            'INSUFFICIENT_ROSTERS',
            'Insufficient roster data to generate parlay'
          )
        }

        // Initialize AI service with multi-provider support
        const aiService = initializeAIService()

        // Determine which AI provider to use
        const preferredProvider =
          (request.headers['x-ai-provider'] as any) || 'openai'

        // Extract generation options from request
        const generationOptions = {
          provider: preferredProvider,
          temperature: requestData.options?.temperature,
          strategy: requestData.options?.strategy,
          maxRetries: 3,
        }

        console.log(
          `Generating parlay for ${requestData.game.awayTeam.displayName} @ ${requestData.game.homeTeam.displayName} using ${preferredProvider} provider`
        )

        // Generate parlay using the AI service
        const parlay = await aiService.generateParlay(
          requestData.game,
          requestData.rosters,
          generationOptions
        )

        // Log successful generation
        console.log(
          `Successfully generated parlay ${parlay.id} with overall confidence: ${parlay.overallConfidence}`
        )

        // Return successful response
        const successResponse: GenerateParlayResponse = {
          success: true,
          data: parlay,
          metadata: {
            provider: preferredProvider,
            generatedAt: new Date().toISOString(),
            rateLimitInfo: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime.toISOString(),
            },
          },
        }

        response.status(200).json(successResponse)
      } catch (error) {
        console.error('Error in generateParlay function:', error)

        // Handle CloudFunctionError
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

        // Handle unexpected errors
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
 * Get appropriate HTTP status code for CloudFunctionError
 */
function getStatusCodeForError(errorCode: string): number {
  const statusCodes: Record<string, number> = {
    INVALID_REQUEST: 400,
    INVALID_INPUT: 400,
    MISSING_ROSTERS: 400,
    INSUFFICIENT_ROSTERS: 400,
    MISSING_API_KEY: 500,
    MISSING_CONFIG: 500,
    OPENAI_ERROR: 503,
    OPENAI_API_ERROR: 503,
    PROVIDER_NOT_AVAILABLE: 503,
    NO_PROVIDERS_CONFIGURED: 500,
    ALL_PROVIDERS_FAILED: 503,
    GENERATION_FAILED: 500,
    PARSE_ERROR: 500,
    MAX_RETRIES_EXCEEDED: 503,
    NO_RESPONSE: 500,
    INVALID_AI_RESPONSE: 500,
    RATE_LIMIT_EXCEEDED: 429,
  }

  return statusCodes[errorCode] || 500
}

/**
 * Health check endpoint for monitoring
 */
export const healthCheck = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        // Initialize AI service and check provider health
        const aiService = initializeAIService()
        const providerStatus = await aiService.validateProviders()
        const providerInfo = aiService.getProviderInfo()

        response.status(200).json({
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          providers: {
            status: providerStatus,
            info: providerInfo,
          },
          version: process.env.npm_package_version || 'unknown',
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
 * Provider switching endpoint (for testing different AI models)
 */
export const switchProvider = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        if (request.method !== 'POST') {
          response.status(405).json({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Only POST requests allowed',
            },
          })
          return
        }

        const { provider } = request.body

        if (
          !provider ||
          !['openai', 'anthropic', 'google', 'local'].includes(provider)
        ) {
          response.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PROVIDER',
              message:
                'Valid provider required: openai, anthropic, google, local',
            },
          })
          return
        }

        const aiService = initializeAIService()

        if (!aiService.isProviderAvailable(provider)) {
          response.status(400).json({
            success: false,
            error: {
              code: 'PROVIDER_NOT_CONFIGURED',
              message: `Provider '${provider}' is not configured or available`,
            },
          })
          return
        }

        aiService.setDefaultProvider(provider)

        response.status(200).json({
          success: true,
          message: `Default provider switched to ${provider}`,
          provider: provider,
        })
      } catch (error: any) {
        console.error('Error switching provider:', error)
        response.status(500).json({
          success: false,
          error: {
            code: 'SWITCH_PROVIDER_FAILED',
            message: 'Failed to switch provider',
            details: error.message,
          },
        })
      }
    })
  }
)

/**
 * Analytics endpoint for tracking bet type diversity
 */
export const getParlayAnalytics = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        // This would connect to a analytics/logging service to track:
        // - Bet type distribution over time
        // - Template pattern detection
        // - Provider performance comparison
        // - User satisfaction metrics

        response.status(200).json({
          success: true,
          message: 'Analytics endpoint - implement with your analytics service',
          betTypeDistribution: {
            // Example structure for future implementation
            spread: 0.25,
            total: 0.2,
            player_props: 0.35,
            moneyline: 0.15,
            special: 0.05,
          },
          templateDetection: {
            classicTemplate: 0.02, // 2% of parlays follow classic template
            averageVariety: 8.5, // out of 10 possible bet types used
          },
        })
      } catch (error) {
        console.error('Error getting analytics:', error)
        response.status(500).json({
          success: false,
          error: {
            code: 'ANALYTICS_ERROR',
            message: 'Failed to retrieve analytics',
          },
        })
      }
    })
  }
)
