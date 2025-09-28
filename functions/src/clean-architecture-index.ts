import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onRequest } from 'firebase-functions/v2/https'
import { Game } from './domain/entities/Game'
import { Team } from './domain/entities/Team'
import { ProviderConfig } from './domain/value-objects/ProviderConfig'
import { Strategy } from './domain/value-objects/Strategy'
import { CleanArchitectureAIService } from './infrastructure/providers/CleanArchitectureAIService'
// import { MockGameRepository } from './infrastructure/repositories/MockGameRepository'
// import { MockPlayerRepository } from './infrastructure/repositories/MockPlayerRepository'

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

// Initialize repositories
// const gameRepository = new MockGameRepository()
// const playerRepository = new MockPlayerRepository()

// Initialize provider repository (mock for now)
const providerRepository = {
  async save(config: ProviderConfig): Promise<void> {
    // Mock implementation
  },
  async findByName(name: string): Promise<ProviderConfig | null> {
    if (name === 'openai') {
      return new ProviderConfig(
        'openai',
        true,
        1,
        30000,
        3,
        openaiApiKey.value(),
        'gpt-4o-mini',
        2000,
        0.7,
        0.0001,
        60,
        10000
      )
    }
    if (name === 'mock') {
      return new ProviderConfig(
        'mock',
        true,
        2,
        30000,
        3,
        'mock-key',
        'mock-model'
      )
    }
    return null
  },
  async findAll(): Promise<ProviderConfig[]> {
    return [
      new ProviderConfig(
        'openai',
        true,
        1,
        30000,
        3,
        openaiApiKey.value(),
        'gpt-4o-mini'
      ),
      new ProviderConfig('mock', true, 2, 30000, 3, 'mock-key', 'mock-model'),
    ]
  },
  async findEnabled(): Promise<ProviderConfig[]> {
    return this.findAll()
  },
  async findByType(): Promise<ProviderConfig[]> {
    return this.findAll()
  },
  async findByPriority(): Promise<ProviderConfig[]> {
    return this.findAll()
  },
  async findWithApiKeys(): Promise<ProviderConfig[]> {
    return this.findAll()
  },
  async findByHealthScoreRange(): Promise<ProviderConfig[]> {
    return this.findAll()
  },
  async update(): Promise<void> {},
  async delete(): Promise<void> {},
  async enable(): Promise<void> {},
  async disable(): Promise<void> {},
  async updatePriority(): Promise<void> {},
  async updateApiKey(): Promise<void> {},
  async getStatistics() {
    return {
      totalProviders: 2,
      enabledProviders: 2,
      disabledProviders: 0,
      providersWithApiKeys: 2,
      averageHealthScore: 0.8,
      priorityDistribution: { 1: 1, 2: 1 },
    }
  },
  async getHealthScores() {
    return { openai: 0.9, mock: 0.7 }
  },
  async search() {
    return this.findAll()
  },
}

// Initialize Clean Architecture AI Service
const aiService = new CleanArchitectureAIService(providerRepository)

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
    homeRoster: any[]
    awayRoster: any[]
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

// Helper function to create game from request
const createGameFromRequest = (request: FrontendRequest): Game => {
  const gameData = request.game || {
    homeTeam: 'Unknown Team',
    awayTeam: 'Unknown Team',
    gameTime: new Date().toISOString(),
    venue: 'Unknown',
    week: 1,
  }

  const homeTeam = new Team(
    'home-team',
    gameData.homeTeam.substring(0, 3).toUpperCase(),
    gameData.homeTeam,
    gameData.homeTeam,
    '#FF0000',
    '#FFFFFF',
    'https://a.espncdn.com/i/teamlogos/nfl/500/default.png'
  )

  const awayTeam = new Team(
    'away-team',
    gameData.awayTeam.substring(0, 3).toUpperCase(),
    gameData.awayTeam,
    gameData.awayTeam,
    '#0000FF',
    '#FFFFFF',
    'https://a.espncdn.com/i/teamlogos/nfl/500/default.png'
  )

  return new Game(
    request.gameId,
    gameData.week || 1,
    1,
    homeTeam,
    awayTeam,
    new Date(gameData.gameTime),
    {
      type: {
        id: '1',
        name: 'Scheduled',
        state: 'pre',
        completed: false,
      },
    }
  )
}

// Helper function to create players from request
const createPlayersFromRequest = (request: FrontendRequest): any[] => {
  const rosterData = request.rosters || {
    homeRoster: [],
    awayRoster: [],
  }

  const homePlayers = rosterData.homeRoster.map(
    (player: any, index: number) => ({
      id: `home-player-${index}`,
      fullName: player.fullName || player.displayName || 'Unknown Player',
      displayName: player.displayName || player.fullName || 'Unknown Player',
      shortName: player.shortName || 'Unknown',
      position: {
        abbreviation: player.position?.abbreviation || 'QB',
        displayName: player.position?.displayName || 'Quarterback',
      },
      jersey: player.jersey || '1',
      experience: {
        years: player.experience?.years || 3,
      },
      age: player.age || 25,
      status: {
        type: player.status?.type || 'active',
        isActive: true,
      },
      teamId: 'home-team',
    })
  )

  const awayPlayers = rosterData.awayRoster.map(
    (player: any, index: number) => ({
      id: `away-player-${index}`,
      fullName: player.fullName || player.displayName || 'Unknown Player',
      displayName: player.displayName || player.fullName || 'Unknown Player',
      shortName: player.shortName || 'Unknown',
      position: {
        abbreviation: player.position?.abbreviation || 'QB',
        displayName: player.position?.displayName || 'Quarterback',
      },
      jersey: player.jersey || '1',
      experience: {
        years: player.experience?.years || 3,
      },
      age: player.age || 25,
      status: {
        type: player.status?.type || 'active',
        isActive: true,
      },
      teamId: 'away-team',
    })
  )

  return [...homePlayers, ...awayPlayers]
}

// Helper function to convert frontend strategy to domain strategy
const convertStrategy = (frontendStrategy: any): Strategy => {
  switch (frontendStrategy.riskLevel) {
    case 'conservative':
      return Strategy.conservative()
    case 'aggressive':
      return Strategy.aggressive()
    default:
      return Strategy.moderate()
  }
}

// Main parlay generation function using Clean Architecture
export const generateParlayClean = onRequest(
  {
    cors: true,
    region: 'us-central1',
    secrets: [openaiApiKey],
    invoker: 'public',
  },
  async (req, res) => {
    try {
      console.log('📥 Received Clean Architecture request:', {
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

      console.log('🎯 Generating parlay with Clean Architecture:', {
        gameId: request.gameId,
        provider: request.options.provider,
        riskLevel: request.options.strategy.riskLevel,
        targetOdds: request.options.strategy.targetOdds,
      })

      // Create domain objects
      const game = createGameFromRequest(request)
      const players = createPlayersFromRequest(request)
      const strategy = convertStrategy(request.options.strategy)

      console.log('🤖 Using Clean Architecture AI service:', {
        game: game.getMatchup(),
        strategy: strategy.name,
        provider: request.options.provider,
      })

      // Generate parlay using Clean Architecture
      const result = await aiService.generateParlay(
        game,
        players,
        strategy,
        request.options.variety,
        {
          provider: request.options.provider,
          temperature: request.options.temperature,
        }
      )

      console.log('✅ Parlay generated successfully with Clean Architecture:', {
        provider: result.metadata.provider,
        confidence: result.metadata.confidence,
        latency: result.metadata.latency,
        legsCount: result.parlay.legs.length,
        varietyScore: result.parlay.getVarietyScore(),
        templateRisk: result.parlay.getTemplateRisk(),
      })

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
          // Clean Architecture specific data
          varietyScore: result.parlay.getVarietyScore(),
          templateRisk: result.parlay.getTemplateRisk(),
          riskLevel: result.parlay.getRiskLevel(),
          isBalanced: result.parlay.isBalanced(),
          summary: result.parlay.getSummary(),
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
          architecture: 'Clean Architecture',
        },
      })
    } catch (error) {
      console.error(
        '❌ Error generating parlay with Clean Architecture:',
        error
      )

      // Set CORS headers for error response
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      res.status(500).json({
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        architecture: 'Clean Architecture',
      })
    }
  }
)

// Health check endpoint
export const healthClean = onRequest(
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

    // Get provider health
    const providerHealth = await aiService.getProviderHealth()
    const parlayStats = await aiService.getParlayStatistics()

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      architecture: 'Clean Architecture',
      services: {
        firebase: 'connected',
        cleanArchitecture: 'active',
        providers: providerHealth,
        parlayStats: parlayStats,
      },
    })
  }
)
