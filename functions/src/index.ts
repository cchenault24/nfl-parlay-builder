import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { OpenAIService } from './service/openaiService'
import {
  CloudFunctionError,
  GameRosters,
  GenerateParlayRequest,
  GenerateParlayResponse,
  NFLGame,
  ValidationResult,
} from './types'

// Initialize Firebase Admin
admin.initializeApp()

// Configure CORS for your frontend domain
const corsHandler = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'https://your-app-domain.vercel.app', // Replace with your actual domain
    /^https:\/\/.*\.vercel\.app$/, // Allow all Vercel preview deployments
  ],
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

/**
 * Generate Parlay Cloud Function
 * Securely handles OpenAI API calls on the server side
 */
export const generateParlay = functions
  .region('us-central1') // Choose region closest to your users
  .runWith({
    timeoutSeconds: 60, // Allow up to 60 seconds for AI generation
    memory: '512MB', // Sufficient memory for OpenAI operations
    secrets: ['OPENAI_API_KEY'], // Secure access to API key
  })
  .https.onRequest(async (request, response) => {
    // Handle CORS first
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

        // Fetch team rosters (you'll need to implement this or pass from client)
        const rosters = await fetchGameRosters(requestData.game)

        // Generate parlay
        const parlay = await openaiService.generateParlay(
          requestData.game,
          rosters,
          requestData.options
        )

        // Log successful generation (be careful not to log sensitive data)
        console.log(`✅ Parlay generated successfully: ${parlay.id}`)

        const successResponse: GenerateParlayResponse = {
          success: true,
          data: parlay,
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
          } else {
            openaiStatus = 'no_api_key'
          }
        } catch {
          openaiStatus = 'error'
        }

        response.status(200).json({
          status: 'healthy',
          timestamp,
          openaiStatus,
          version: '1.0.0',
        })
      } catch (error) {
        console.error('Health check failed:', error)
        response.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        })
      }
    })
  })

// === Helper Functions ===

/**
 * Validate generate parlay request data
 */
function validateGenerateParlayRequest(body: any): ValidationResult {
  const errors: string[] = []

  if (!body) {
    errors.push('Request body is required')
    return { isValid: false, errors }
  }

  if (!body.game) {
    errors.push('Game data is required')
  } else {
    // Validate game object
    if (!body.game.id) errors.push('Game ID is required')
    if (!body.game.homeTeam || !body.game.homeTeam.id) {
      errors.push('Valid home team data is required')
    }
    if (!body.game.awayTeam || !body.game.awayTeam.id) {
      errors.push('Valid away team data is required')
    }
    if (!body.game.week || typeof body.game.week !== 'number') {
      errors.push('Valid week number is required')
    }
  }

  // Validate options if provided
  if (body.options) {
    if (
      body.options.temperature &&
      (typeof body.options.temperature !== 'number' ||
        body.options.temperature < 0 ||
        body.options.temperature > 1)
    ) {
      errors.push('Temperature must be a number between 0 and 1')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Fetch game rosters - This is a simplified version
 * In production, you'd want to cache this data or fetch from your own API
 */
async function fetchGameRosters(game: NFLGame): Promise<GameRosters> {
  try {
    console.log(
      `📋 Fetching rosters for ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
    )

    // Mock implementation - replace with actual roster fetching
    const mockRoster = [
      {
        id: 'mock-qb-1',
        fullName: 'Mock Quarterback',
        displayName: 'M. Quarterback',
        shortName: 'M. QB',
        position: {
          abbreviation: 'QB',
          displayName: 'Quarterback',
        },
        jersey: '1',
        experience: { years: 5 },
        age: 28,
        status: { type: 'active' },
      },
      {
        id: 'mock-rb-1',
        fullName: 'Mock Running Back',
        displayName: 'M. Running Back',
        shortName: 'M. RB',
        position: {
          abbreviation: 'RB',
          displayName: 'Running Back',
        },
        jersey: '21',
        experience: { years: 3 },
        age: 25,
        status: { type: 'active' },
      },
      {
        id: 'mock-wr-1',
        fullName: 'Mock Wide Receiver',
        displayName: 'M. Wide Receiver',
        shortName: 'M. WR',
        position: {
          abbreviation: 'WR',
          displayName: 'Wide Receiver',
        },
        jersey: '11',
        experience: { years: 4 },
        age: 26,
        status: { type: 'active' },
      },
    ]

    return {
      homeRoster: mockRoster,
      awayRoster: mockRoster,
    }
  } catch (error) {
    console.error('Error fetching game rosters:', error)
    throw new CloudFunctionError(
      'ROSTER_FETCH_FAILED',
      'Failed to fetch team rosters',
      error
    )
  }
}

/**
 * Get appropriate HTTP status code from error
 */
function getStatusCodeFromError(error: any): number {
  if (error instanceof CloudFunctionError) {
    switch (error.code) {
      case 'INVALID_REQUEST':
      case 'INVALID_GAME':
      case 'INVALID_ROSTERS':
        return 400
      case 'MISSING_API_KEY':
      case 'MISSING_CONFIG':
        return 500
      case 'INSUFFICIENT_ROSTER_DATA':
        return 422
      case 'OPENAI_ERROR':
        return 502
      case 'GENERATION_FAILED':
      case 'PARSE_ERROR':
        return 500
      default:
        return 500
    }
  }

  return 500
}
