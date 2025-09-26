import type { ParlayOptions } from '@npb/shared'
import type { Request, Response } from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { ESPNServerClient } from '../clients/espnClient'
import { ParlayAIService } from '../service/ai/ParlayAIService'
import { MockProvider } from '../service/ai/providers/MockProvider'
import { OpenAIProvider } from '../service/ai/providers/OpenAIProvider'
import { DataOrchestrator } from '../service/data/dataOrchestrator'

// Initialize services
const espnClient = new ESPNServerClient()
const dataOrchestrator = new DataOrchestrator(espnClient)

// Initialize AI service
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
  console.warn('⚠️ OPENAI_API_KEY not found, OpenAI provider not available')
}

// Always register Mock provider for development and fallback
const mockProvider = new MockProvider({
  enableErrorSimulation: false,
  errorRate: 0.0,
  minDelayMs: 800,
  maxDelayMs: 2000,
  defaultConfidence: 7,
  debugMode: process.env.NODE_ENV === 'development',
})
aiService.registerProvider('mock', mockProvider)
console.log('✅ Mock provider registered for fallback and development')

// Default configurations
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

    try {
      const { gameId, options = {} } = req.body as {
        gameId: string
        options?: ParlayOptions
      }

      if (!gameId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: gameId',
        })
        return
      }

      // CRITICAL: Extract provider preference from options
      const requestedProvider = options.provider || 'auto'
      console.log(
        `🏈 Generating parlay for game: ${gameId} with provider: ${requestedProvider}`
      )

      // Fetch game and roster data
      const unifiedData = await dataOrchestrator.byGameId(gameId)
      const { game, rosters } = unifiedData

      console.log(`📊 Game data retrieved:`, {
        gameId,
        awayTeam: game.awayTeam?.displayName,
        homeTeam: game.homeTeam?.displayName,
        week: game.week,
        requestedProvider,
      })

      // Generate parlay using AI service with explicit provider selection
      const result = await aiService.generateParlay(
        game,
        rosters,
        defaultStrategy,
        defaultVarietyFactors,
        {
          provider: requestedProvider, // CRITICAL: Pass through provider choice
          temperature: options.temperature,
          debugMode: true,
        }
      )

      console.log(`✅ Parlay generated successfully:`, {
        actualProvider: result.metadata.provider,
        requestedProvider,
        legCount: result.parlay.legs?.length || 0,
        hasGameSummary: !!(result.parlay as any).gameSummary,
        confidence: result.metadata.confidence,
        latency: `${result.metadata.latency}ms`,
        fallbackUsed: result.metadata.fallbackUsed,
      })

      // Ensure gameSummary exists for AI Analysis UI
      const enhancedParlay = result.parlay as any
      if (!enhancedParlay.gameSummary) {
        console.warn('⚠️ Generated parlay missing gameSummary, adding fallback')
        enhancedParlay.gameSummary = generateFallbackGameSummary(game)
        enhancedParlay.gameContext = `${game.awayTeam?.displayName || 'Away'} @ ${game.homeTeam?.displayName || 'Home'} - Week ${game.week || 'TBD'}`
      }

      res.status(200).json({
        success: true,
        data: enhancedParlay,
        metadata: {
          ...result.metadata,
          requestedProvider,
          actualProvider: result.metadata.provider,
          providerMatch: result.metadata.provider === requestedProvider,
        },
      })
    } catch (error) {
      console.error('❌ Error generating parlay:', error)

      res.status(500).json({
        success: false,
        error:
          'Parlay generation service is temporarily unavailable. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
)

/**
 * Generate fallback gameSummary when AI provider fails to include it
 */
function generateFallbackGameSummary(game: any): any {
  const awayTeam = game.awayTeam?.displayName || 'Away Team'
  const homeTeam = game.homeTeam?.displayName || 'Home Team'

  return {
    matchupAnalysis: `This ${awayTeam} vs ${homeTeam} matchup features contrasting styles and should provide an interesting game flow. Both teams bring unique strengths that could determine the outcome.`,
    gameFlow: 'balanced_tempo',
    keyFactors: [
      'Home field advantage could play a significant role',
      'Weather conditions appear favorable for both teams',
      'Recent form and injury reports favor competitive play',
    ],
    prediction: `Expecting a competitive game between ${awayTeam} and ${homeTeam} with multiple momentum swings and strategic adjustments.`,
    confidence: 7,
  }
}
