// functions/src/index.ts - Complete file with proper provider selection
import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
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
    'https://nfl-parlay-builder.web.app',
    'https://nfl-parlay-builder.firebaseapp.com',
    /^https:\/\/nfl-parlay-builder--[\w-]+\.web\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// Rate limiter instance
// const rateLimiter = new RateLimiter({
//   windowMinutes: 60,
//   maxRequests: process.env.NODE_ENV === 'development' ? 100 : 10,
//   cleanupAfterHours: 24,
// })

/**
 * Get provider from client request (UI controlled)
 */
function getProviderFromRequest(requestedProvider?: string): AIProvider {
  console.log('DEBUG: getProviderFromRequest called with:', requestedProvider)

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
    console.log(`DEBUG: Using valid provider: ${requestedProvider}`)
    return requestedProvider as AIProvider
  }

  // BACKWARDS COMPATIBILITY ONLY - remove this after frontend is updated
  if (requestedProvider === 'openai') {
    console.warn(
      'DEPRECATED: "real" provider name used, mapping to "openai". Please update frontend to use "openai" directly.'
    )
    return 'openai'
  }

  // Default to openai if nothing specified or invalid
  console.log('DEBUG: Invalid or missing provider, defaulting to openai')
  return 'openai'
}

/**
 * AI service initialization - clean provider setup
 */
function initializeAIService(): ParlayAIService {
  const openaiKey = process.env.OPENAI_API_KEY
  const hasOpenAIKey =
    !!openaiKey && openaiKey !== 'undefined' && openaiKey.trim() !== ''

  console.log('DEBUG: Initializing AI Service...')
  console.log('DEBUG: Has OpenAI Key:', hasOpenAIKey)

  const parlayAI = new ParlayAIService({
    primaryProvider: hasOpenAIKey ? 'openai' : 'mock',
    fallbackProviders: hasOpenAIKey ? ['mock'] : [],
    enableFallback: true,
    debugMode: true,
  })

  // Always register mock provider
  console.log('DEBUG: Registering mock provider...')
  const mockProvider = new MockProvider({
    enableErrorSimulation: false,
    errorRate: 0,
    minDelayMs: 100,
    maxDelayMs: 300,
    debugMode: true,
  })
  parlayAI.registerProvider('mock', mockProvider)
  console.log('DEBUG: Mock provider registered')

  // Register OpenAI if available
  if (hasOpenAIKey) {
    try {
      console.log('DEBUG: Registering OpenAI provider...')
      const openaiProvider = new OpenAIProvider({
        apiKey: openaiKey,
        model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
        defaultTemperature: parseFloat(
          process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'
        ),
        defaultMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
      })
      parlayAI.registerProvider('openai', openaiProvider)
      console.log('DEBUG: OpenAI provider registered successfully')
    } catch (error) {
      console.error('ERROR: Failed to register OpenAI provider:', error)
      throw error
    }
  } else {
    console.warn(
      'WARNING: No valid OpenAI API key found, only mock provider available'
    )
  }

  console.log('DEBUG: AI Service initialization complete')
  return parlayAI
}

/**
 * Main parlay generation endpoint - uses AIProvider values only
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
        console.log('DEBUG: generateParlay function started')

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

        // DEBUG: Log what we received
        console.log(
          'DEBUG: Raw request options:',
          JSON.stringify(requestData.options, null, 2)
        )

        // Get provider - should now be 'openai' or 'mock' directly from frontend
        const requestedProvider = requestData.options?.provider
        console.log(
          'DEBUG: Requested provider (should be openai/mock):',
          requestedProvider
        )

        const selectedProvider = getProviderFromRequest(requestedProvider)
        console.log('DEBUG: Selected provider:', selectedProvider)

        // Skip rate limiting for debugging
        console.log('DEBUG: Skipping rate limiting for debugging')

        // Initialize AI service
        console.log('DEBUG: Initializing AI service...')
        const aiService = initializeAIService()

        // Debug service status
        const serviceStatus = aiService.getServiceStatus()
        console.log(
          'DEBUG: Service status:',
          JSON.stringify(serviceStatus, null, 2)
        )

        const providerHealth = aiService.getProviderHealth()
        console.log(
          'DEBUG: Provider health:',
          JSON.stringify(providerHealth, null, 2)
        )

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

        console.log('DEBUG: Building context...')
        const context = ContextBuilder.buildContext(
          requestData.game,
          requestData.rosters,
          strategy,
          varietyFactors
        )

        if (requestData.options?.temperature) {
          context.temperature = requestData.options.temperature
        }

        console.log(
          `DEBUG: Generating parlay for ${requestData.game.awayTeam.displayName} @ ${requestData.game.homeTeam.displayName}`
        )
        console.log(`DEBUG: Using provider: ${selectedProvider}`)

        // Generation options
        const generationOptions = {
          provider: selectedProvider, // Now 'openai' or 'mock' directly
          temperature: requestData.options?.temperature,
          debugMode: true,
        }

        console.log(
          'DEBUG: Generation options:',
          JSON.stringify(generationOptions, null, 2)
        )

        // Generate parlay
        console.log(
          `DEBUG: Calling aiService.generateParlay with provider: ${selectedProvider}`
        )

        const result = await aiService.generateParlay(
          requestData.game,
          requestData.rosters,
          strategy,
          varietyFactors,
          generationOptions
        )

        console.log(
          'DEBUG: Generation completed successfully with provider:',
          result.metadata?.provider
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

/**
 * Health check endpoint
 */
export const healthCheck = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        const aiService = initializeAIService()
        console.log('DEBUG: Checking AI service status...')
        const serviceStatus = aiService.getServiceStatus()
        console.log(
          'DEBUG: AI service status:',
          JSON.stringify(serviceStatus, null, 2)
        )
        console.log('DEBUG: Registered providers:')
        const registeredProviders = aiService.getRegisteredProviders() // You might need to add this method
        console.log(
          'DEBUG: Available providers:',
          Object.keys(registeredProviders || {})
        )

        console.log('DEBUG: Attempting to generate parlay...')
        response.status(200).json({
          success: true,
          data: {
            status: serviceStatus.healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            service: {
              ...serviceStatus,
              environment: process.env.NODE_ENV || 'production',
              mockProvider: {
                enabled: true,
                available: true,
              },
              realProvider: {
                enabled: !!process.env.OPENAI_API_KEY,
                apiKeyConfigured: !!process.env.OPENAI_API_KEY,
              },
            },
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
          environment: process.env.NODE_ENV || 'production',
        })
      }
    })
  }
)

/**
 * Get Rate Limit Status endpoint
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

        response.status(200).json({
          success: true,
          data: {
            remaining: 9,
            total: 10,
            currentCount: 1,
            resetTime: new Date(Date.now() + 3600000).toISOString(),
          },
        })
      } catch (error) {
        console.error('Error in getRateLimitStatus:', error)
        response.status(500).json({
          success: false,
          error: 'Failed to get rate limit status',
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

// Import cleanup functions from utils
export { cleanupRateLimits, manualCleanupRateLimits } from './utils/cleanup'
