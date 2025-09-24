// functions/src/index.ts - Complete file with CORS fix and provider improvements
import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { RateLimiter } from './middleware/rateLimiter'
import { ContextBuilder } from './service/ai/ContextBuilder'
import { AIProvider, ParlayAIService } from './service/ai/ParlayAIService'
import { MockProvider } from './service/ai/providers/MockProvider'
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
    'http://172.31.48.1:3000',
    'https://nfl-parlay-builder.web.app',
    'https://nfl-parlay-builder.firebaseapp.com',
    /^https:\/\/nfl-parlay-builder--[\w-]+\.web\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

/**
 * Get provider from client request - uses actual AIProvider values
 * Frontend should send: 'openai' | 'mock' | 'anthropic' | 'google' | 'auto'
 */
function getProviderFromRequest(requestedProvider?: string): AIProvider {
  // Validate against actual AIProvider types
  const validProviders: AIProvider[] = [
    'openai',
    'anthropic',
    'google',
    'mock',
    'auto',
  ]

  if (
    requestedProvider &&
    validProviders.includes(requestedProvider as AIProvider)
  ) {
    return requestedProvider as AIProvider
  }

  // Default to openai if nothing specified or invalid

  return 'openai'
}

/**
 * AI service initialization with proper provider health setup
 */
function initializeAIService(): ParlayAIService {
  const openaiKey = process.env.OPENAI_API_KEY
  const hasOpenAIKey =
    !!openaiKey && openaiKey !== 'undefined' && openaiKey.trim() !== ''

  const parlayAI = new ParlayAIService({
    primaryProvider: hasOpenAIKey ? 'openai' : 'mock',
    fallbackProviders: hasOpenAIKey ? ['mock'] : [],
    enableFallback: true,
    debugMode: true,
  })

  // Always register mock provider first

  const mockProvider = new MockProvider({
    enableErrorSimulation: false,
    errorRate: 0,
    minDelayMs: 100,
    maxDelayMs: 300,
    debugMode: true,
  })
  parlayAI.registerProvider('mock', mockProvider)

  // Register OpenAI if we have a valid API key
  if (hasOpenAIKey) {
    try {
      const openaiProvider = new OpenAIProvider({
        apiKey: openaiKey,
        model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
        defaultTemperature: parseFloat(
          process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'
        ),
        defaultMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
      })
      parlayAI.registerProvider('openai', openaiProvider)
    } catch (error) {
      console.error('ERROR: Failed to register OpenAI provider:', error)
      throw error
    }
  } else {
    console.warn(
      'WARNING: No valid OpenAI API key found, only mock provider available'
    )
  }

  return parlayAI
}

/**
 * Main parlay generation endpoint with provider selection
 */
export const generateParlay = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
    secrets: ['OPENAI_API_KEY'],
  })
  .https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        // Validate request method
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

        // Get provider - should now be 'openai' or 'mock' directly from frontend
        const requestedProvider = requestData.options?.provider

        const selectedProvider = getProviderFromRequest(requestedProvider)

        // Initialize AI service
        const aiService = initializeAIService()

        // Build generation context
        const strategy = requestData.strategy || {
          name: 'balanced',
          description: 'Balanced risk approach',
          temperature: 0.7,
          focusAreas: ['spread', 'total'],
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

        if (requestData.options?.temperature) {
          context.temperature = requestData.options.temperature
        }

        // Generation options
        const generationOptions = {
          provider: selectedProvider, // Now 'openai' or 'mock' directly
          temperature: requestData.options?.temperature,
          debugMode: true,
        }

        const result = await aiService.generateParlay(
          requestData.game,
          requestData.rosters,
          strategy,
          varietyFactors,
          generationOptions
        )

        // Return successful response
        const successResponse: GenerateParlayResponse = {
          success: true,
          data: result.parlay,
          rateLimitInfo: {
            remaining: 9,
            resetTime: new Date(Date.now() + 3600000).toISOString(),
            currentCount: 1,
            total: selectedProvider === 'mock' ? 100 : 10,
          },
          metadata: {
            provider: result.metadata?.provider || selectedProvider,
            generatedAt: new Date().toISOString(),
            rateLimitInfo: {
              remaining: 9,
              resetTime: new Date(Date.now() + 3600000).toISOString(),
            },
            ...(result.metadata && {
              aiProvider: result.metadata.provider,
              model: result.metadata.model,
              tokens: result.metadata.tokens,
              latency: result.metadata.latency,
              confidence: result.metadata.confidence,
              fallbackUsed: result.metadata.fallbackUsed,
              attemptCount: result.metadata.attemptCount,
            }),
            serviceMode: selectedProvider, // 'openai' or 'mock'
            environment: process.env.NODE_ENV || 'production',
          },
        }

        response.status(200).json(successResponse)
      } catch (error) {
        console.error('ERROR: Full error in generateParlay function:', error)
        console.error(
          'ERROR: Error message:',
          error instanceof Error ? error.message : String(error)
        )
        console.error(
          'ERROR: Error stack:',
          error instanceof Error ? error.stack : 'No stack'
        )

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
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred while generating the parlay',
            details:
              process.env.NODE_ENV === 'development'
                ? {
                    message:
                      error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                  }
                : undefined,
          },
        })
      }
    })
  })

/**
 * Health check endpoint with proper CORS
 */
export const healthCheck = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        const aiService = initializeAIService()
        const serviceStatus = aiService.getServiceStatus()
        const providerHealth = aiService.getProviderHealth()
        const registeredProviders = aiService.getRegisteredProviders()

        response.status(200).json({
          success: true,
          data: {
            service: serviceStatus,
            providers: providerHealth,
            registeredProviders: Array.from(registeredProviders.keys()),
            environment: process.env.NODE_ENV || 'production',
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        console.error('ERROR: Health check failed:', error)
        response.status(500).json({
          success: false,
          error: {
            code: 'HEALTH_CHECK_FAILED',
            message: 'Health check failed',
            details:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
        })
      }
    })
  }
)

/**
 * FIXED: Get Rate Limit Status endpoint with proper CORS
 */
export const getRateLimitStatus = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
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

        // Initialize rate limiter with same config as main function
        const rateLimiter = new RateLimiter({
          windowMinutes: parseInt(
            process.env.RATE_LIMIT_WINDOW_MINUTES || '60'
          ),
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
        })

        // Get user info from auth token or IP address
        let userId: string | undefined
        let ipAddress: string | undefined

        // Try to get user from auth token
        const authHeader = request.headers.authorization
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7)
            const decodedToken = await admin.auth().verifyIdToken(token)
            userId = decodedToken.uid
          } catch (authError) {
            console.warn('Invalid auth token in getRateLimitStatus:', authError)
            // Fall back to IP-based limiting
          }
        }

        // If no valid user token, use IP address
        if (!userId) {
          ipAddress =
            request.ip ||
            (request.headers['x-forwarded-for'] as string) ||
            request.connection.remoteAddress ||
            'unknown'
        }

        // Get current rate limit status without incrementing counter
        const rateLimitResult = await rateLimiter.getRateLimitStatus(
          userId,
          ipAddress
        )

        const rateLimitInfo = {
          remaining: rateLimitResult.remaining,
          total: rateLimiter.config.maxRequests, // Access max requests from config
          currentCount: rateLimitResult.currentCount,
          resetTime: rateLimitResult.resetTime.toISOString(),
        }

        response.status(200).json({
          success: true,
          data: rateLimitInfo,
        })
      } catch (error) {
        console.error('Error in getRateLimitStatus:', error)

        // Return error response but with fallback data to prevent UI breaking
        response.status(500).json({
          success: false,
          error: 'Failed to get rate limit status',
          data: {
            remaining: 0,
            total: 10,
            currentCount: 10,
            resetTime: new Date(Date.now() + 3600000).toISOString(),
          },
        })
      }
    })
  })

/**
 * Validation function
 */
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
  } else {
    if (!body.rosters.homeRoster || !Array.isArray(body.rosters.homeRoster)) {
      errors.push('Home roster is required and must be an array')
    }
    if (!body.rosters.awayRoster || !Array.isArray(body.rosters.awayRoster)) {
      errors.push('Away roster is required and must be an array')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Error status code mapping
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

// Import cleanup functions from utils
export { cleanupRateLimits, manualCleanupRateLimits } from './utils/cleanup'
