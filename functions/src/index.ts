import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onRequest } from 'firebase-functions/v2/https'
import { ParlayAIService } from './service/ai/ParlayAIService'
import { MockProvider } from './service/ai/providers/MockProvider'
import { OpenAIProvider } from './service/ai/providers/OpenAIProvider'
import {
  GameRosters,
  NFLGame,
  NFLPlayer,
  StrategyConfig,
  VarietyFactors,
} from './types'

// Initialize Firebase Admin
admin.initializeApp()

// Define secrets
const openaiApiKey = defineSecret('OPENAI_API_KEY')

// Set global options for gen 2 functions
setGlobalOptions({
  maxInstances: 20,
  timeoutSeconds: 60,
  memory: '1GiB',
  cpu: 1,
})

// Initialize AI Service
const aiService = new ParlayAIService({
  primaryProvider: 'mock', // Start with mock as primary
  fallbackProviders: ['openai'],
  maxRetries: 3,
  healthCheckInterval: 5 * 60 * 1000,
  enableFallback: true,
  debugMode: true,
})

// Register mock provider first (always available)
const mockProvider = new MockProvider({
  enableErrorSimulation: false,
  debugMode: true,
  defaultConfidence: 7,
})

aiService.registerProvider('mock', mockProvider)

// Initialize OpenAI provider lazily when needed
let openaiProvider: OpenAIProvider | null = null

const initializeOpenAIProvider = async (): Promise<OpenAIProvider | null> => {
  if (openaiProvider) {
    return openaiProvider
  }

  try {
    // Get OpenAI API key from Firebase secret
    const apiKey = openaiApiKey.value()

    if (!apiKey) {
      console.warn(
        '⚠️ OpenAI API key not found in Firebase secret, using mock provider only'
      )
      return null
    }

    openaiProvider = new OpenAIProvider({
      apiKey: apiKey,
      model: 'gpt-4o-mini',
      defaultMaxTokens: 2000,
      defaultTemperature: 0.7,
    })

    aiService.registerProvider('openai', openaiProvider)
    console.log('✅ OpenAI provider initialized successfully')

    return openaiProvider
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI provider:', error)
    return null
  }
}

// CORS is handled automatically by gen 2 functions

// Types
interface FrontendRequest {
  gameId: string
  game?: {
    homeTeam: string
    awayTeam: string
    gameTime: string
    venue: string
    week: number
  }
  rosters?: {
    homeRoster: NFLPlayer[]
    awayRoster: NFLPlayer[]
  }
  options: {
    provider: string
    strategy: {
      riskLevel: 'conservative' | 'moderate' | 'aggressive'
      targetOdds: number
      maxLegs: number
      minLegs: number
    }
    variety: {
      includePlayerProps: boolean
      includeGameProps: boolean
      includeTeamProps: boolean
      diversifyPositions: boolean
    }
    temperature: number
  }
  timestamp?: string
}

// Helper function to validate request
const validateRequest = (body: any): { isValid: boolean; error?: string } => {
  if (!body) {
    return { isValid: false, error: 'Request body is required' }
  }

  if (!body.gameId) {
    return { isValid: false, error: 'Game ID is required' }
  }

  if (!body.options?.provider) {
    return { isValid: false, error: 'Provider is required' }
  }

  if (!body.options?.strategy?.riskLevel) {
    return { isValid: false, error: 'Risk level is required' }
  }

  return { isValid: true }
}

// Helper function to create game data from request (using actual game data)
const createGameDataFromRequest = (request: FrontendRequest): NFLGame => {
  // Extract game data from the request
  const gameData = request.game || {
    homeTeam: 'Unknown Team',
    awayTeam: 'Unknown Team',
    gameTime: new Date().toISOString(),
    venue: 'Unknown',
    week: 1,
  }

  // Create team objects from the request data
  const homeTeam = {
    id: gameData.homeTeam || 'UNKNOWN',
    abbreviation: gameData.homeTeam || 'UNK',
    displayName: gameData.homeTeam || 'Unknown Team',
    shortDisplayName: gameData.homeTeam || 'Unknown',
    color: '#000000',
    alternateColor: '#FFFFFF',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/default.png',
  }

  const awayTeam = {
    id: gameData.awayTeam || 'UNKNOWN',
    abbreviation: gameData.awayTeam || 'UNK',
    displayName: gameData.awayTeam || 'Unknown Team',
    shortDisplayName: gameData.awayTeam || 'Unknown',
    color: '#000000',
    alternateColor: '#FFFFFF',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/default.png',
  }

  return {
    id: request.gameId || 'unknown-game',
    week: gameData.week || 1, // Use week from request, default to 1
    seasonType: 1,
    date: gameData.gameTime || new Date().toISOString(),
    homeTeam,
    awayTeam,
    status: {
      type: {
        id: '1',
        name: 'Scheduled',
        state: 'pre',
        completed: false,
      },
    },
  }
}

// Helper function to create roster data from request (using actual roster data)
const createRosterDataFromRequest = (request: FrontendRequest): GameRosters => {
  // Extract roster data from the request
  const rosterData = request.rosters || {
    homeRoster: [],
    awayRoster: [],
  }

  return {
    homeRoster: rosterData.homeRoster || [],
    awayRoster: rosterData.awayRoster || [],
  }
}

// Helper function to convert frontend strategy to AI service format
const convertStrategy = (frontendStrategy: any): StrategyConfig => {
  return {
    name: `${frontendStrategy.riskLevel} strategy`,
    description: `${frontendStrategy.riskLevel} risk approach`,
    riskLevel: frontendStrategy.riskLevel,
    temperature: 0.7,
    focusAreas: ['offense', 'defense'],
    betTypeWeights: {},
    contextFactors: ['weather', 'injuries', 'rest'],
    confidenceRange: [5, 9],
    preferredGameScripts: ['close_game', 'balanced_tempo'],
  }
}

// Helper function to convert frontend variety to AI service format
const convertVarietyFactors = (frontendVariety: any): VarietyFactors => {
  return {
    strategy: 'balanced',
    gameScript: 'close_game',
    focusArea: frontendVariety.includePlayerProps ? 'offense' : 'balanced',
    riskTolerance: 0.5,
    playerTier: 'star',
    marketBias: 'neutral',
    timeContext: 'mid_season',
    motivationalFactors: [],
  }
}

// Main parlay generation function
export const generateParlay = onRequest(
  {
    cors: true,
    region: 'us-central1',
    secrets: [openaiApiKey],
    invoker: 'public',
  },
  async (req, res) => {
    try {
      console.log('📥 Received request:', {
        method: req.method,
        headers: req.headers,
        body: req.body,
      })

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).send('')
        return
      }

      // Only allow POST requests
      if (req.method !== 'POST') {
        res.status(405).json({
          error: 'Method not allowed',
          allowedMethods: ['POST'],
        })
        return
      }

      // Validate request body
      const validation = validateRequest(req.body)
      if (!validation.isValid) {
        res.status(400).json({
          error: validation.error,
          receivedBody: req.body,
        })
        return
      }

      const request = req.body as FrontendRequest

      // Check rate limiting
      let userId = 'anonymous'
      try {
        const authHeader = req.headers.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1]
          userId = `user_${token.slice(0, 8)}` // Use first 8 chars as user ID
        }
      } catch (error) {
        console.warn('Error parsing auth token:', error)
        // Continue with anonymous user
      }

      // Check if user has exceeded rate limit
      const rateLimitInfo = getRateLimitInfo(userId)
      if (rateLimitInfo.remaining <= 0) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `You have exceeded the rate limit of ${rateLimitInfo.total} requests per hour. Please try again after ${new Date(rateLimitInfo.resetTime).toLocaleString()}`,
          rateLimitInfo: {
            remaining: rateLimitInfo.remaining,
            resetTime: rateLimitInfo.resetTime,
            currentCount: rateLimitInfo.currentCount,
            total: rateLimitInfo.total,
          },
        })
        return
      }

      console.log('🎯 Generating parlay with:', {
        gameId: request.gameId,
        provider: request.options.provider,
        riskLevel: request.options.strategy.riskLevel,
        targetOdds: request.options.strategy.targetOdds,
        userId,
        rateLimitRemaining: rateLimitInfo.remaining,
      })

      // Create game and roster data using actual data from request
      const game = createGameDataFromRequest(request)
      const rosters = createRosterDataFromRequest(request)
      const strategy = convertStrategy(request.options.strategy)
      const varietyFactors = convertVarietyFactors(request.options.variety)

      console.log('🤖 Using AI service with context:', {
        game: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
        strategy: strategy.name,
        variety: varietyFactors.focusArea,
      })

      // Initialize OpenAI provider if requested and not already initialized
      if (request.options.provider === 'openai') {
        await initializeOpenAIProvider()
      }

      // Determine the actual provider to use (fallback to mock if openai not available)
      let actualProvider = request.options.provider
      if (request.options.provider === 'openai' && !openaiProvider) {
        console.log(
          '⚠️ OpenAI provider not available, falling back to mock provider'
        )
        actualProvider = 'mock'
      }

      // Generate parlay using AI service
      const result = await aiService.generateParlay(
        game,
        rosters,
        strategy,
        varietyFactors,
        {
          provider: actualProvider,
          temperature: request.options.temperature,
        }
      )

      console.log('✅ Parlay generated successfully:', {
        provider: result.metadata.provider,
        confidence: result.metadata.confidence,
        latency: result.metadata.latency,
        legsCount: result.parlay.legs.length,
      })

      // Increment rate limit after successful generation
      incrementRateLimit(userId)
      const updatedRateLimitInfo = getRateLimitInfo(userId)
      console.log('📊 Updated rate limit info:', updatedRateLimitInfo)

      // Set CORS headers explicitly
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      res.status(200).json({
        success: true,
        data: {
          legs: result.parlay.legs,
          totalOdds: result.parlay.estimatedOdds,
          potentialPayout: 0, // Calculate from odds if needed
          confidence: result.parlay.overallConfidence,
          reasoning: result.parlay.aiReasoning,
          generatedAt: new Date().toISOString(),
          provider: result.metadata.provider,
          gameContext: result.parlay.gameContext,
          gameSummary: result.parlay.gameSummary,
        },
        metadata: {
          requestId: req.get('x-request-id') || 'unknown',
          timestamp: new Date().toISOString(),
          processingTime: result.metadata.latency,
          provider: result.metadata.provider,
          model: result.metadata.model,
          tokens: result.metadata.tokens,
          fallbackUsed: result.metadata.fallbackUsed,
          attemptCount: result.metadata.attemptCount,
        },
        rateLimitInfo: {
          remaining: updatedRateLimitInfo.remaining,
          resetTime: updatedRateLimitInfo.resetTime,
          currentCount: updatedRateLimitInfo.currentCount,
          total: updatedRateLimitInfo.total,
        },
      })
    } catch (error) {
      console.error('❌ Error generating parlay:', error)

      // Set CORS headers for error response
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      res.status(500).json({
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      })
    }
  }
)

// Health check endpoint
export const health = onRequest(
  {
    cors: true,
    region: 'us-central1',
    invoker: 'public',
  },
  async (req, res) => {
    // Set CORS headers explicitly
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        firebase: 'connected',
        // Add other service checks here
      },
    })
  }
)

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10, // Max requests per window
  windowMs: 60 * 60 * 1000, // 1 hour window
  cleanupInterval: 5 * 60 * 1000, // Clean up expired entries every 5 minutes
}

// Clean up expired rate limit entries
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, RATE_LIMIT_CONFIG.cleanupInterval)

// Helper function to get rate limit info for a user
const getRateLimitInfo = (userId: string) => {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    const newEntry: RateLimitEntry = {
      count: 0,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    }
    rateLimitStore.set(userId, newEntry)
    return {
      remaining: RATE_LIMIT_CONFIG.maxRequests,
      resetTime: new Date(newEntry.resetTime).toISOString(),
      currentCount: 0,
      total: RATE_LIMIT_CONFIG.maxRequests,
      windowMs: RATE_LIMIT_CONFIG.windowMs,
    }
  }

  return {
    remaining: Math.max(0, RATE_LIMIT_CONFIG.maxRequests - entry.count),
    resetTime: new Date(entry.resetTime).toISOString(),
    currentCount: entry.count,
    total: RATE_LIMIT_CONFIG.maxRequests,
    windowMs: RATE_LIMIT_CONFIG.windowMs,
  }
}

// Helper function to increment rate limit for a user
const incrementRateLimit = (userId: string) => {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    }
    rateLimitStore.set(userId, newEntry)
    return true
  }

  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return false // Rate limit exceeded
  }

  entry.count++
  return true
}

// Get rate limit status endpoint
export const getRateLimitStatus = onRequest(
  {
    cors: true,
    region: 'us-central1',
    invoker: 'public',
  },
  async (req, res) => {
    try {
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).send('')
        return
      }

      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' })
        return
      }

      // Get user ID from auth token if available
      let userId = 'anonymous'
      try {
        const authHeader = req.headers.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1]
          // In a real implementation, you would verify the token here
          // For now, we'll use a simple approach
          userId = `user_${token.slice(0, 8)}` // Use first 8 chars as user ID
        }
      } catch (error) {
        console.warn('Error parsing auth token:', error)
        // Continue with anonymous user
      }

      const rateLimitStatus = getRateLimitInfo(userId)

      // Set CORS headers explicitly
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      res.status(200).json({
        success: true,
        data: rateLimitStatus,
      })
    } catch (error) {
      console.error('Error fetching rate limit status:', error)

      // Set CORS headers for error response
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      res.status(500).json({
        error: 'Failed to fetch rate limit status',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
)
