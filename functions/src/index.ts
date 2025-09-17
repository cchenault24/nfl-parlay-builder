import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { RateLimiter, getClientIpAddress } from './middleware/rateLimiter'
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
const rateLimiter = new RateLimiter({
  windowMinutes: 60,
  maxRequests: process.env.NODE_ENV === 'development' ? 100 : 10,
  cleanupAfterHours: 24,
})

/**
 * Enhanced AI service initialization with mock support
 */
function initializeAIService(): ParlayAIService {
  const shouldMock = shouldUseMockProvider()

  const parlayAI = new ParlayAIService({
    primaryProvider: shouldMock ? ('mock' as AIProvider) : 'openai',
    fallbackProviders: shouldMock ? [] : ['mock' as AIProvider],
    enableFallback: true,
    debugMode: process.env.NODE_ENV === 'development',
  })

  const mockProvider = new MockProvider({
    enableErrorSimulation: process.env.NODE_ENV === 'development',
    errorRate: parseFloat(process.env.MOCK_ERROR_RATE || '0.05'),
    minDelayMs: parseInt(process.env.MOCK_MIN_DELAY || '500'),
    maxDelayMs: parseInt(process.env.MOCK_MAX_DELAY || '1500'),
    debugMode: process.env.NODE_ENV === 'development',
  })
  parlayAI.registerProvider('mock', mockProvider)

  if (process.env.OPENAI_API_KEY && !shouldMock) {
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
  }

  return parlayAI
}

/**
 * Determine if mock provider should be used
 */
function shouldUseMockProvider(): boolean {
  // Check for explicit environment variable
  if (process.env.USE_MOCK_PROVIDER !== undefined) {
    return process.env.USE_MOCK_PROVIDER === 'true'
  }

  // Check for missing OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎭 No OpenAI API key found, using mock provider')
    }
    return true
  }

  // Default behavior based on environment
  if (process.env.NODE_ENV === 'development') {
    // In development, default to mock unless explicitly set to use real
    return process.env.USE_REAL_PROVIDER !== 'true'
  }

  // In production, default to real provider
  return false
}

/**
 * Main parlay generation endpoint with enhanced mock/real support
 */
export const generateParlay = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: shouldUseMockProvider() ? 60 : 120, // Less timeout needed for mock
    memory: shouldUseMockProvider() ? '256MB' : '512MB', // Less memory needed for mock
    secrets: shouldUseMockProvider() ? [] : ['OPENAI_API_KEY'], // No secrets needed for mock
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

        // Rate limiting (more lenient for mock)
        const clientIp = getClientIpAddress(request)
        const rateLimitResult = await rateLimiter.checkRateLimit(
          clientIp,
          shouldUseMockProvider() ? 'mock' : 'real'
        )

        if (!rateLimitResult.allowed) {
          response.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please try again later.',
              details: {
                remaining: rateLimitResult.remaining,
                resetTime: rateLimitResult.resetTime.toISOString(),
                currentCount: rateLimitResult.currentCount,
              },
            },
          })
          return
        }

        // Parse request
        const requestData: GenerateParlayRequest = request.body

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

        // Add temperature from options if provided
        if (requestData.options?.temperature) {
          context.temperature = requestData.options.temperature
        }

        const providerType = shouldUseMockProvider() ? 'mock' : 'real'
        console.log(
          `${providerType.toUpperCase()} MODE: Generating parlay for ${requestData.game.awayTeam.displayName} @ ${requestData.game.homeTeam.displayName}`
        )

        // Generate parlay using AI service
        const result = await aiService.generateParlay(
          requestData.game,
          requestData.rosters,
          strategy,
          varietyFactors,
          {
            provider: shouldUseMockProvider()
              ? 'mock'
              : requestData.options?.provider,
            temperature: requestData.options?.temperature,
            debugMode: process.env.NODE_ENV === 'development',
          }
        )

        console.log(
          `✅ Successfully generated parlay with ${result.metadata?.provider} provider`
        )

        // Return successful response
        const successResponse: GenerateParlayResponse = {
          success: true,
          data: result.parlay,
          rateLimitInfo: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime.toISOString(),
            currentCount: rateLimitResult.currentCount,
            total: shouldUseMockProvider() ? 100 : 10,
          },
          metadata: {
            provider:
              result.metadata?.provider ||
              (shouldUseMockProvider() ? 'mock' : 'openai'),
            generatedAt: new Date().toISOString(),
            rateLimitInfo: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime.toISOString(),
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
            serviceMode: shouldUseMockProvider()
              ? ('mock' as const)
              : ('real' as const),
            environment: process.env.NODE_ENV || 'production',
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
 * Enhanced health check endpoint with provider information
 */
export const healthCheck = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      try {
        const aiService = initializeAIService()
        const serviceStatus = aiService.getServiceStatus()
        const usingMock = shouldUseMockProvider()

        response.status(200).json({
          success: true,
          data: {
            status: serviceStatus.healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            service: {
              ...serviceStatus,
              mode: usingMock ? 'mock' : 'real',
              environment: process.env.NODE_ENV || 'production',
              mockProvider: {
                enabled: true,
                asFlakback: !usingMock,
              },
              realProvider: {
                enabled: !!process.env.OPENAI_API_KEY && !usingMock,
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
          mode: shouldUseMockProvider() ? 'mock' : 'real',
        })
      }
    })
  }
)

/**
 * New endpoint to switch between mock and real modes (development only)
 */
export const switchMode = functions.https.onRequest(
  async (request, response) => {
    corsHandler(request, response, async () => {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        response.status(403).json({
          success: false,
          error: 'Mode switching is only available in development',
        })
        return
      }

      if (request.method !== 'POST') {
        response.status(405).json({
          success: false,
          error: 'Only POST requests are allowed',
        })
        return
      }

      const { mode } = request.body

      if (!mode || !['mock', 'real'].includes(mode)) {
        response.status(400).json({
          success: false,
          error: 'Mode must be either "mock" or "real"',
        })
        return
      }

      // This would typically update a configuration store
      // For now, we'll just return the current state
      response.status(200).json({
        success: true,
        message: `Mode switch requested: ${mode}`,
        note: 'Restart function to apply changes',
        currentMode: shouldUseMockProvider() ? 'mock' : 'real',
      })
    })
  }
)

// Validation and utility functions (unchanged)
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
