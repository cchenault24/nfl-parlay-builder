// functions/src/index.ts - Complete fix
import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { ContextBuilder } from './service/ai/ContextBuilder'
import { AIProvider, ParlayAIService } from './service/ai/ParlayAIService'
import { MockProvider } from './service/ai/providers/MockProvider'
import { OpenAIProvider } from './service/ai/providers/OpenAIProvider'
import {
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

// // Rate limiter instance
// const rateLimiter = new RateLimiter({
//   windowMinutes: 60,
//   maxRequests: process.env.NODE_ENV === 'development' ? 100 : 10,
//   cleanupAfterHours: 24,
// })

/**
 * Get provider from client request (UI controlled)
 */
function getProviderFromRequest(requestedProvider?: string): 'mock' | 'real' {
  // Provider selection is now entirely controlled by the client UI
  if (requestedProvider === 'mock') return 'mock'
  if (requestedProvider === 'real') return 'real'

  // Default to real if not specified
  return 'real'
}

/**
 * AI service initialization - always register both providers
 */
function initializeAIService(): ParlayAIService {
  const parlayAI = new ParlayAIService({
    primaryProvider: 'openai' as AIProvider, // Default primary
    fallbackProviders: ['mock' as AIProvider],
    enableFallback: true,
    debugMode: process.env.NODE_ENV === 'development',
  })

  // Always register mock provider
  const mockProvider = new MockProvider({
    enableErrorSimulation: process.env.NODE_ENV === 'development',
    errorRate: parseFloat(process.env.MOCK_ERROR_RATE || '0.05'),
    minDelayMs: parseInt(process.env.MOCK_MIN_DELAY || '500'),
    maxDelayMs: parseInt(process.env.MOCK_MAX_DELAY || '1500'),
    debugMode: process.env.NODE_ENV === 'development',
  })
  parlayAI.registerProvider('mock', mockProvider)

  // Always try to register OpenAI provider if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: (process.env.OPENAI_MODEL as any) || 'gpt-4o-mini',
        defaultTemperature: parseFloat(
          process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'
        ),
        defaultMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
      })
      parlayAI.registerProvider('openai', openaiProvider)

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ OpenAI provider registered successfully')
      }
    } catch (error) {
      console.warn('⚠️ Failed to register OpenAI provider:', error)
    }
  } else {
    console.warn('⚠️ No OpenAI API key found - only mock provider available')
  }

  return parlayAI
}

/**
 * Main parlay generation endpoint with UI-controlled provider selection
 */
export const generateParlay = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
    secrets: ['OPENAI_API_KEY'],
  })
  .https.onRequest(async (request, response) => {
    console.log('🚀 generateParlay function started')
    console.log('Request method:', request.method)
    console.log('Request headers:', request.headers)
    console.log('Request body keys:', Object.keys(request.body || {}))

    corsHandler(request, response, async () => {
      try {
        console.log('📋 CORS handler executed successfully')

        // Validate request method
        if (request.method !== 'POST') {
          console.log('❌ Invalid method:', request.method)
          response.status(405).json({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Only POST requests are allowed',
            },
          })
          return
        }

        console.log('✅ Method validation passed')

        // Validate request body exists
        if (!request.body) {
          console.log('❌ No request body provided')
          response.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'Request body is required',
            },
          })
          return
        }

        console.log('✅ Request body exists')

        // Validate request body structure
        console.log('🔍 Validating request body structure...')
        const validation = validateGenerateParlayRequest(request.body)
        if (!validation.isValid) {
          console.log('❌ Request validation failed:', validation.errors)
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

        console.log('✅ Request validation passed')

        const requestData: GenerateParlayRequest = request.body

        // Get provider from UI request
        const requestedProvider = requestData.options?.provider
        const providerMode = getProviderFromRequest(requestedProvider)
        const shouldUseMock = providerMode === 'mock'

        console.log(
          `🎯 Provider Selection: UI requested '${requestedProvider}' -> Using '${providerMode}'`
        )

        // Skip rate limiting for now to simplify debugging
        console.log('⏭️ Skipping rate limiting for debugging')

        // Initialize AI service with error handling
        console.log('🤖 Initializing AI service...')
        try {
          const aiService = initializeAIService()
          console.log('✅ AI service initialized successfully')

          // Check if providers are registered
          const serviceStatus = aiService.getServiceStatus()
          console.log('📊 AI Service status:', serviceStatus)
        } catch (serviceError) {
          console.error('❌ AI service initialization failed:', serviceError)
          response.status(500).json({
            success: false,
            error: {
              code: 'SERVICE_INITIALIZATION_FAILED',
              message: 'Failed to initialize AI service',
              details:
                process.env.NODE_ENV === 'development'
                  ? String(serviceError)
                  : undefined,
            },
          })
          return
        }

        // Build generation context with error handling
        console.log('🏗️ Building generation context...')
        let context
        try {
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

          console.log('🏗️ Calling ContextBuilder.buildContext...')
          context = ContextBuilder.buildContext(
            requestData.game,
            requestData.rosters,
            strategy,
            varietyFactors
          )
          console.log('✅ Context built successfully')
        } catch (contextError) {
          console.error('❌ Context building failed:', contextError)
          response.status(500).json({
            success: false,
            error: {
              code: 'CONTEXT_BUILD_FAILED',
              message: 'Failed to build generation context',
              details:
                process.env.NODE_ENV === 'development'
                  ? String(contextError)
                  : undefined,
            },
          })
          return
        }

        // Add temperature from options if provided
        if (requestData.options?.temperature) {
          context.temperature = requestData.options.temperature
        }

        console.log(
          `${providerMode.toUpperCase()} MODE: Generating parlay for ${requestData.game.awayTeam.displayName} @ ${requestData.game.homeTeam.displayName}`
        )

        // For now, return a simple mock response to test the pipeline
        if (shouldUseMock || true) {
          // Force mock for debugging
          console.log('🎭 Returning mock response for debugging')

          const mockParlay = {
            id: `mock-parlay-${Date.now()}`,
            legs: [
              {
                id: 'leg-1',
                betType: 'spread',
                selection: `${requestData.game.homeTeam.displayName} -3.5`,
                target: '-3.5',
                reasoning: 'Mock reasoning for home team spread',
                confidence: 7,
                odds: '-110',
              },
              {
                id: 'leg-2',
                betType: 'total',
                selection: 'Over 47.5',
                target: '47.5',
                reasoning: 'Mock reasoning for game total',
                confidence: 6,
                odds: '-110',
              },
              {
                id: 'leg-3',
                betType: 'player_prop',
                selection: 'QB Over 250.5 passing yards',
                target: '250.5',
                reasoning: 'Mock reasoning for QB prop',
                confidence: 8,
                odds: '+120',
              },
            ],
            gameContext: `${requestData.game.awayTeam.displayName} @ ${requestData.game.homeTeam.displayName} - Week ${requestData.game.week}`,
            aiReasoning: 'Mock AI reasoning for development testing',
            overallConfidence: 7,
            estimatedOdds: '+280',
            createdAt: new Date().toISOString(),
            gameSummary: {
              matchupAnalysis: `Mock analysis for ${requestData.game.awayTeam.displayName} vs ${requestData.game.homeTeam.displayName}`,
              gameFlow: 'balanced_tempo',
              keyFactors: [
                'Home field advantage',
                'Weather conditions',
                'Key matchups',
              ],
              prediction: 'Mock game prediction',
              confidence: 6,
            },
          }

          const successResponse: GenerateParlayResponse = {
            success: true,
            data: mockParlay as any,
            rateLimitInfo: {
              remaining: 99,
              resetTime: new Date(Date.now() + 3600000).toISOString(),
              currentCount: 1,
              total: 100,
            },
            metadata: {
              provider: 'mock',
              generatedAt: new Date().toISOString(),
              rateLimitInfo: {
                remaining: 99,
                resetTime: new Date(Date.now() + 3600000).toISOString(),
              },
              serviceMode: 'mock',
              environment: process.env.NODE_ENV || 'development',
            },
          }

          console.log('📤 Sending mock success response')
          response.status(200).json(successResponse)
          return
        }
      } catch (error) {
        console.error('💥 CRITICAL ERROR in generateParlay function:')
        console.error(
          'Error message:',
          error instanceof Error ? error.message : String(error)
        )
        console.error(
          'Error stack:',
          error instanceof Error ? error.stack : 'No stack trace'
        )
        console.error('Error type:', typeof error)
        console.error('Error constructor:', error?.constructor?.name)

        response.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred while generating the parlay',
            details:
              process.env.NODE_ENV === 'development'
                ? {
                    message:
                      error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    type: typeof error,
                  }
                : undefined,
          },
        })
      }
    })
  })

/**
 * Health check endpoint (updated to not use shouldUseMockProvider)
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
 * Validation function
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

// /**
//  * Error status code mapping
//  */
// function getStatusCodeForError(errorCode: string): number {
//   const statusCodes: Record<string, number> = {
//     INVALID_REQUEST: 400,
//     MISSING_ROSTERS: 400,
//     INSUFFICIENT_ROSTERS: 400,
//     MISSING_API_KEY: 500,
//     MISSING_CONFIG: 500,
//     OPENAI_ERROR: 503,
//     PROVIDER_NOT_AVAILABLE: 503,
//     GENERATION_FAILED: 500,
//     PARSE_ERROR: 500,
//     NO_RESPONSE: 500,
//     RATE_LIMIT_EXCEEDED: 429,
//   }
//   return statusCodes[errorCode] || 500
// }

/**
 * Get Rate Limit Status endpoint
 * This function was missing and causing CORS errors
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

        // For now, return mock rate limit data since we don't have user-specific tracking yet
        const mockRateLimitInfo = {
          remaining: 9,
          total: 10,
          currentCount: 1,
          resetTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        }

        response.status(200).json({
          success: true,
          data: mockRateLimitInfo,
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

// Import cleanup functions from utils
export { cleanupRateLimits, manualCleanupRateLimits } from './utils/cleanup'
