import type { ParlayOptions } from '@npb/shared'
import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { ESPNServerClient } from '../clients/espnClient'
import { ParlayAIService } from '../service/ai/ParlayAIService'
import { OpenAIProvider } from '../service/ai/providers/OpenAIProvider'
import { DataOrchestrator } from '../service/data/dataOrchestrator'

// Initialize services
const espnClient = new ESPNServerClient()
const dataOrchestrator = new DataOrchestrator(espnClient)

// Initialize AI service with OpenAI provider
const aiService = new ParlayAIService({
  primaryProvider: 'openai',
  fallbackProviders: ['mock'],
  enableFallback: true,
  debugMode: process.env.NODE_ENV === 'development',
})

// Register OpenAI provider if API key is available
if (process.env.OPENAI_API_KEY) {
  const openaiProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
  })
  aiService.registerProvider('openai', openaiProvider)
  console.log('✅ OpenAI provider registered with API key')
} else {
  console.warn('⚠️ OPENAI_API_KEY not found, AI generation will use fallback')
}

// Default strategy and variety factors
const defaultStrategy = {
  name: 'Balanced Analysis',
  temperature: 0.7,
  riskProfile: 'medium' as const,
  confidenceRange: [5, 8] as [number, number],
}

const defaultVarietyFactors = {
  strategy: 'balanced',
  focusArea: 'matchup_based',
  playerTier: 'all_players',
  gameScript: 'competitive',
  marketBias: 'neutral',
}

export const generateParlay = onRequest(
  {
    region: 'us-central1',
    cors: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://nfl-parlay-builder.web.app',
      'https://nfl-parlay-builder.firebaseapp.com',
    ],
    // Increase timeout for AI processing
    timeoutSeconds: 60,
  },
  async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.',
      })
      return
    }

    const startTime = Date.now()
    const { gameId, options } = req.body

    if (!gameId || typeof gameId !== 'string' || !gameId.trim()) {
      res.status(400).json({
        success: false,
        error: 'gameId is required and must be a non-empty string',
      })
      return
    }

    try {
      console.log(`🚀 Starting parlay generation for game: ${gameId}`)

      // Step 1: Fetch unified game data (game + rosters)
      console.log('📊 Fetching game data from ESPN...')
      const unifiedData = await dataOrchestrator.byGameId(gameId.trim())
      const { game, rosters } = unifiedData

      if (!game || !game.id) {
        throw new Error(`Game not found: ${gameId}`)
      }

      console.log(
        `✅ Game data fetched: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
      )

      // Step 2: Validate rosters have sufficient data
      if (!rosters || !rosters.home || !rosters.away) {
        console.warn('⚠️ Roster data missing, using mock rosters')
        // Create minimal roster structure for AI to work with
        rosters.home = rosters.home || []
        rosters.away = rosters.away || []
      }

      console.log(
        `📋 Rosters: Home (${rosters.home.length}) vs Away (${rosters.away.length})`
      )

      // Step 3: Process options and set up generation context
      const processedOptions: ParlayOptions = {
        strategy: options?.strategy || 'balanced',
        variety: {
          strategy:
            options?.variety?.strategy || defaultVarietyFactors.strategy,
          focusArea:
            options?.variety?.focusArea || defaultVarietyFactors.focusArea,
          playerTier:
            options?.variety?.playerTier || defaultVarietyFactors.playerTier,
          gameScript:
            options?.variety?.gameScript || defaultVarietyFactors.gameScript,
          marketBias:
            options?.variety?.marketBias || defaultVarietyFactors.marketBias,
        },
        riskTolerance: options?.riskTolerance ?? 0.5,
        temperature: options?.temperature ?? 0.7,
        maxLegs: options?.maxLegs ?? 3,
      }

      console.log('🎯 Generation options:', processedOptions)

      // Step 4: Check if AI service has registered providers
      const registeredProviders = aiService.getRegisteredProviders()
      const hasOpenAI = registeredProviders.has('openai')
      const shouldUseMock = !hasOpenAI || options?.provider === 'mock'

      if (shouldUseMock) {
        console.log('🤖 Using mock AI provider (OpenAI not available)')

        // Generate enhanced mock response
        const mockParlay = generateEnhancedMockParlay(
          game,
          rosters,
          processedOptions
        )

        const responseTime = Date.now() - startTime

        res.status(200).json({
          success: true,
          data: mockParlay,
          metadata: {
            provider: 'mock',
            model: 'mock-enhanced-v1',
            latency: responseTime,
            confidence: 7, // Use fixed confidence since mockParlay doesn't have overallConfidence
            fallbackUsed: !hasOpenAI,
            attemptCount: 1,
            serviceMode: 'mock',
            environment: process.env.NODE_ENV || 'production',
          },
        })
        return
      }

      // Step 5: Generate parlay using AI service
      console.log('🧠 Generating parlay with OpenAI...')

      const result = await aiService.generateParlay(
        game,
        rosters,
        defaultStrategy,
        processedOptions.variety || defaultVarietyFactors,
        {
          temperature: processedOptions.temperature,
          provider: 'openai',
        }
      )

      const responseTime = Date.now() - startTime
      console.log(`✅ Parlay generated successfully in ${responseTime}ms`)

      res.status(200).json({
        success: true,
        data: result.parlay,
        metadata: {
          ...result.metadata,
          latency: responseTime,
          serviceMode: 'openai',
          environment: process.env.NODE_ENV || 'production',
        },
      })
    } catch (error) {
      const responseTime = Date.now() - startTime
      console.error(
        `❌ Parlay generation failed after ${responseTime}ms:`,
        error
      )

      // Provide fallback mock response on error
      try {
        console.log('🔄 Attempting fallback mock generation...')
        const mockData = await dataOrchestrator.byGameId(gameId.trim())
        const mockParlay = generateEnhancedMockParlay(
          mockData.game,
          mockData.rosters,
          options || {}
        )

        res.status(200).json({
          success: true,
          data: mockParlay,
          metadata: {
            provider: 'mock',
            model: 'fallback-mock-v1',
            latency: responseTime,
            confidence: 6, // Use fixed confidence since mockParlay doesn't have overallConfidence
            fallbackUsed: true,
            attemptCount: 1,
            serviceMode: 'mock',
            environment: process.env.NODE_ENV || 'production',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      } catch (fallbackError) {
        console.error('💥 Fallback also failed:', fallbackError)

        res.status(500).json({
          success: false,
          error:
            'Parlay generation service is temporarily unavailable. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }
)

/**
 * Generate enhanced mock parlay with game-specific data
 * Uses the correct GeneratedParlay interface from @npb/shared
 */
function generateEnhancedMockParlay(
  game: any,
  rosters: any,
  options: any
): any {
  const gameContext = `${game.awayTeam?.displayName || 'Away Team'} @ ${game.homeTeam?.displayName || 'Home Team'} - Week ${game.week || 'TBD'}`

  // Generate contextual legs using the correct interface structure
  const legs = [
    {
      type: 'spread' as const,
      selection: `${game.homeTeam?.displayName || 'Home Team'} -3.5`,
      threshold: -3.5,
      price: -110,
      rationale: `${game.homeTeam?.displayName || 'Home team'} has strong home field advantage and favorable matchup against ${game.awayTeam?.displayName || 'the visiting team'}. Recent form and defensive metrics support the home favorite.`,
    },
    {
      type: 'total' as const,
      selection: 'Over 47.5',
      threshold: 47.5,
      price: -105,
      rationale:
        'Both offenses have shown consistent scoring ability this season. Weather conditions are favorable, and recent head-to-head matchups suggest a higher-scoring affair.',
    },
    {
      type: 'player_prop' as const,
      selection: 'Starting QB Over 275.5 Passing Yards',
      threshold: 275.5,
      price: 105,
      rationale:
        'Opposing secondary has allowed significant passing yardage in recent games. Game script likely favors passing volume, and weather conditions support the aerial attack.',
    },
  ]

  return {
    gameId: game.id,
    legs,
    notes: `AI-generated parlay analysis for ${gameContext}. This parlay combines strong statistical trends with current game conditions and matchup advantages.`,
  }
}
