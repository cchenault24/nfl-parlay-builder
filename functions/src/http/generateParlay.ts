import type { Request, Response } from 'express'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { ESPNServerClient } from '../clients/espnClient'
import { ParlayAIService } from '../service/ai/ParlayAIService'
import { OpenAIProvider } from '../service/ai/providers/OpenAIProvider'
import { DataOrchestrator } from '../service/data/dataOrchestrator'
import {
  DEFAULT_STRATEGIES,
  DEFAULT_VARIETY_FACTORS,
  ParlayOptions,
  StrategyConfig,
  VarietyFactors,
} from '../types'

// Define secret for OpenAI API key
const openaiApiKey = defineSecret('OPENAI_API_KEY')

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

// Default strategy and variety factors
const defaultStrategy: StrategyConfig = DEFAULT_STRATEGIES.balanced
const defaultVarietyFactors: VarietyFactors = DEFAULT_VARIETY_FACTORS

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
    memory: '1GiB',
    secrets: [openaiApiKey], // Include the secret
  },
  async (req: Request, res: Response) => {
    try {
      // Register OpenAI provider with the secret at runtime
      const apiKey = openaiApiKey.value()
      if (apiKey) {
        const openaiProvider = new OpenAIProvider({
          apiKey,
          model: 'gpt-4o-mini',
          defaultTemperature: 0.7,
          defaultMaxTokens: 4000,
        })
        aiService.registerProvider('openai', openaiProvider)
        console.log('✅ OpenAI provider registered with API key')
      } else {
        console.warn(
          '⚠️ OPENAI_API_KEY not found, AI generation will use fallback'
        )
      }

      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Method not allowed. Use POST.',
          },
        })
        return
      }

      console.log('🎯 Parlay generation request received')

      const { gameId, options = {} } = req.body as {
        gameId: string
        options?: ParlayOptions
      }

      // Validate required fields
      if (!gameId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_GAME_ID',
            message: 'gameId is required',
          },
        })
        return
      }

      console.log(`📊 Fetching game data for gameId: ${gameId}`)

      // Get unified game data
      const unifiedData = await dataOrchestrator.byGameId(gameId)
      const { game, rosters } = unifiedData

      console.log(
        `🏈 Game: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
      )
      console.log(
        `👥 Rosters: ${rosters.home.length} home, ${rosters.away.length} away players`
      )

      // Validate roster data
      if (
        !rosters.home ||
        !rosters.away ||
        rosters.home.length === 0 ||
        rosters.away.length === 0
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROSTER_DATA',
            message: 'Complete roster data is required for both teams',
          },
        })
        return
      }

      // Use provided strategy and variety factors or defaults
      const strategy: StrategyConfig = options.strategy || defaultStrategy
      const varietyFactors: VarietyFactors =
        options.variety || defaultVarietyFactors

      console.log('🤖 Generating parlay with AI service...')
      console.log(
        `🎛️ Strategy: ${strategy.name}, Provider: ${options.provider || 'auto'}`
      )
      console.log(
        `📈 Risk Level: ${strategy.riskLevel}, Temperature: ${strategy.temperature}`
      )

      // Generate parlay using AI service
      const result = await aiService.generateParlay(
        game,
        rosters,
        strategy,
        varietyFactors,
        {
          temperature: options.temperature || strategy.temperature,
          provider: options.provider,
          debugMode: process.env.NODE_ENV === 'development',
        }
      )

      console.log('✅ Parlay generated successfully')
      console.log(
        `🎲 Parlay: ${result.parlay.legs?.length || 0} legs, confidence: ${result.parlay.overallConfidence}/10`
      )
      console.log(
        `🔧 Provider: ${result.metadata?.provider}, Model: ${result.metadata?.model}`
      )
      console.log(
        `⚡ Latency: ${result.metadata?.latency}ms, Tokens: ${result.metadata?.tokens || 'N/A'}`
      )

      // Prepare response
      const response = {
        success: true,
        data: result.parlay,
        metadata: {
          ...(result.metadata || {}),
          requestedProvider: options.provider,
          actualProvider: result.metadata?.provider,
          providerMatch:
            !options.provider || options.provider === result.metadata?.provider,
        },
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('❌ Error generating parlay:', error)

      // Determine error type and appropriate response
      let statusCode = 500
      let errorCode = 'GENERATION_FAILED'
      let errorMessage = 'Failed to generate parlay'

      if (error instanceof Error) {
        errorMessage = error.message

        // Check for specific error types
        if (error.message.includes('API key')) {
          statusCode = 401
          errorCode = 'INVALID_API_KEY'
        } else if (
          error.message.includes('rate limit') ||
          error.message.includes('quota')
        ) {
          statusCode = 429
          errorCode = 'RATE_LIMITED'
        } else if (
          error.message.includes('validation') ||
          error.message.includes('invalid')
        ) {
          statusCode = 400
          errorCode = 'VALIDATION_ERROR'
        } else if (error.message.includes('timeout')) {
          statusCode = 504
          errorCode = 'TIMEOUT_ERROR'
        } else if (
          error.message.includes('network') ||
          error.message.includes('fetch')
        ) {
          statusCode = 503
          errorCode = 'NETWORK_ERROR'
        }
      }

      const errorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details:
            process.env.NODE_ENV === 'development'
              ? {
                  stack: error instanceof Error ? error.stack : undefined,
                  timestamp: new Date().toISOString(),
                  gameId: req.body?.gameId,
                }
              : undefined,
        },
      }

      res.status(statusCode).json(errorResponse)
    }
  }
)
