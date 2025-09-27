// functions/src/http/generateParlay.ts

import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { ESPNServerClient } from '../clients/espnClient'
import { ParlayAIService } from '../service/ai/ParlayAIService'
import { OpenAIProvider } from '../service/ai/providers/OpenAIProvider'
import { DataOrchestrator } from '../service/data/dataOrchestrator'

import {
  BetType,
  GeneratedParlay,
  GenerateParlayResponse,
  NFLGameStatus,
  ParlayLeg,
  ParlayOptions,
} from '../types'

// --- Local helper types (server-side shape kept minimal) ---
type ProviderName = 'mock' | 'openai'
type WithProvider<T> = T & { provider?: ProviderName; temperature?: number }

interface StrategyConfig {
  name: string
  riskLevel?: 'conservative' | 'medium' | 'aggressive'
  temperature?: number
}

type VarietyFactors = Record<string, unknown>

// --- Secrets ---
const openaiApiKey = defineSecret('OPENAI_API_KEY')

// --- Services ---
const espnClient = new ESPNServerClient()
const dataOrchestrator = new DataOrchestrator(espnClient)
const aiService = new ParlayAIService({
  primaryProvider: 'openai',
  fallbackProviders: ['mock'],
  enableFallback: true,
  debugMode: process.env.NODE_ENV === 'development',
})

// --- Local defaults (don’t depend on removed shared constants) ---
const defaultStrategy: StrategyConfig = {
  name: 'Balanced',
  riskLevel: 'medium',
  temperature: 0.7,
}
const defaultVarietyFactors: VarietyFactors = {}

// --- Adapters to bridge legacy types (../types) and new shared types ---
const normalizeStatus = (raw: string): NFLGameStatus => {
  const s = raw.toLowerCase()
  if (s === 'pre' || s === 'scheduled') return 'scheduled'
  if (s === 'in' || s === 'live' || s === 'in_progress') return 'in_progress'
  if (s === 'post' || s === 'final') return 'final'
  return 'scheduled'
}

const normalizeBetType = (bt: BetType): ParlayLeg['betType'] => {
  if (bt === 'player_prop') return 'player_prop'
  if (
    bt === 'moneyline' ||
    bt === 'spread' ||
    bt === 'total' ||
    bt === 'player_prop'
  )
    return bt as ParlayLeg['betType']
  return 'spread'
}

const toSharedParlay = (p: any): GeneratedParlay => ({
  gameId: p.gameId,
  legs: Array.isArray(p.legs)
    ? p.legs.map((l: any) => ({
        id: String(l.id),
        description: String(l.description ?? ''),
        betType: normalizeBetType(l.betType),
        odds: Number(l.odds ?? 0),
        confidence: Number(l.confidence ?? 0),
      }))
    : [],
  summary: typeof p.summary === 'string' ? p.summary : undefined,
  gameSummary: p.gameSummary,
})

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
    secrets: [openaiApiKey],
  },
  async (req, res) => {
    try {
      // Enforce POST
      if (req.method !== 'POST') {
        const errorResp: GenerateParlayResponse & {
          error: string
        } = { success: false, error: 'Method not allowed. Use POST.' }
        res.status(405).json(errorResp)
        return
      }

      // Register OpenAI at runtime using secret
      const apiKey = openaiApiKey.value()
      if (apiKey) {
        const openaiProvider = new OpenAIProvider({
          apiKey,
          model: 'gpt-4o-mini',
          defaultTemperature: 0.7,
          defaultMaxTokens: 4000,
        })
        aiService.registerProvider('openai', openaiProvider)
        console.log('✅ OpenAI provider registered')
      } else {
        console.warn('⚠️ OPENAI_API_KEY not found, using fallback provider')
      }

      console.log('🎯 Parlay generation request received')

      const { gameId, options = {} as WithProvider<ParlayOptions> } =
        req.body as {
          gameId: string
          options?: WithProvider<ParlayOptions>
        }

      if (!gameId) {
        const errorResp: GenerateParlayResponse & { error: string } = {
          success: false,
          error: 'gameId is required',
        }
        res.status(400).json(errorResp)
        return
      }

      console.log(`📊 Fetching game data for gameId: ${gameId}`)

      // Get unified game + rosters
      const { game, rosters } = await dataOrchestrator.byGameId(gameId)

      console.log(
        `🏈 Game: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
      )
      console.log(
        `👥 Rosters: ${rosters.home.length} home, ${rosters.away.length} away`
      )

      // Basic roster validation
      if (!rosters.home?.length || !rosters.away?.length) {
        const errorResp: GenerateParlayResponse & { error: string } = {
          success: false,
          error: 'Complete roster data is required for both teams',
        }
        res.status(400).json(errorResp)
        return
      }

      // Apply strategy and variety (with local defaults)
      const strategy: StrategyConfig =
        (options as any).strategy || defaultStrategy
      const varietyFactors: VarietyFactors =
        (options as any).variety || defaultVarietyFactors

      const provider: ProviderName | undefined = (options as any).provider
      const temperature =
        (options as any).temperature ?? strategy.temperature ?? 0.7

      console.log('🤖 Generating parlay with AI service...')
      console.log(
        `🎛️ Strategy: ${strategy.name}, Provider: ${provider || 'auto'}`
      )
      console.log(
        `📈 Risk Level: ${strategy.riskLevel}, Temperature: ${temperature}`
      )

      const result = await aiService.generateParlay(
        // cast to legacy types (../types) expected by older AI service signatures
        {
          ...game,
          status: normalizeStatus((game as any).status ?? 'scheduled'),
        } as unknown as import('../types').NFLGame,
        rosters as unknown as import('../types').GameRosters,
        strategy as any,
        varietyFactors as any,
        {
          temperature,
          provider,
          debugMode: process.env.NODE_ENV === 'development',
        }
      )

      console.log('✅ Parlay generated successfully')
      console.log(`🎲 Legs: ${result.parlay?.legs?.length ?? 0}`)
      if (result.metadata) {
        console.log(
          `🔧 Provider: ${result.metadata.provider} | Model: ${result.metadata.model}`
        )
        console.log(
          `⚡ Latency: ${result.metadata.latency}ms | Tokens: ${
            (result.metadata as any).tokens ?? 'N/A'
          }`
        )
      }

      const response: GenerateParlayResponse = {
        success: true,
        parlay: result.parlay ? toSharedParlay(result.parlay) : undefined,
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('❌ Error generating parlay:', error)

      // Map to a user-safe error
      let statusCode = 500
      let errorCode = 'GENERATION_FAILED'
      let errorMessage = 'Failed to generate parlay'

      if (error instanceof Error) {
        errorMessage = error.message
        const msg = error.message.toLowerCase()
        if (msg.includes('api key')) {
          statusCode = 401
          errorCode = 'INVALID_API_KEY'
        } else if (msg.includes('rate limit') || msg.includes('quota')) {
          statusCode = 429
          errorCode = 'RATE_LIMITED'
        } else if (msg.includes('validation') || msg.includes('invalid')) {
          statusCode = 400
          errorCode = 'VALIDATION_ERROR'
        } else if (msg.includes('timeout')) {
          statusCode = 504
          errorCode = 'TIMEOUT_ERROR'
        } else if (msg.includes('network') || msg.includes('fetch')) {
          statusCode = 503
          errorCode = 'NETWORK_ERROR'
        }
      }

      const body = {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details:
            process.env.NODE_ENV === 'development'
              ? {
                  stack: error instanceof Error ? error.stack : undefined,
                  timestamp: new Date().toISOString(),
                  gameId: (req as any).body?.gameId,
                }
              : undefined,
        },
      }

      res.status(statusCode).json(body)
    }
  }
)
