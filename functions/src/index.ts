import cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

// Initialize Firebase Admin
admin.initializeApp()

// Configure CORS to allow requests from your frontend
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}

const corsHandler = cors(corsOptions)

// Types
interface ParlayPreferences {
  game: {
    homeTeam: string
    awayTeam: string
    gameTime: string
    venue: string
  }
  rosters: {
    homeRoster: any[]
    awayRoster: any[]
  }
  strategy: {
    riskLevel: 'conservative' | 'moderate' | 'aggressive'
    targetOdds: number
    maxLegs: number
    minLegs: number
  }
  varietyFactors: {
    includePlayerProps: boolean
    includeGameProps: boolean
    includeTeamProps: boolean
    diversifyPositions: boolean
  }
  options: {
    budget: number
    excludeInjuredPlayers: boolean
    favoriteTeamBias?: string
  }
}

interface RequestBody {
  provider: string
  preferences: ParlayPreferences
  timestamp?: string
}

// Helper function to validate request
const validateRequest = (body: any): { isValid: boolean; error?: string } => {
  if (!body) {
    return { isValid: false, error: 'Request body is required' }
  }

  if (!body.provider) {
    return { isValid: false, error: 'Provider is required' }
  }

  if (!body.preferences) {
    return { isValid: false, error: 'Preferences are required' }
  }

  const { preferences } = body

  if (!preferences.game?.homeTeam || !preferences.game?.awayTeam) {
    return { isValid: false, error: 'Game teams are required' }
  }

  if (!preferences.strategy?.riskLevel) {
    return { isValid: false, error: 'Risk level is required' }
  }

  if (!preferences.options?.budget || preferences.options.budget <= 0) {
    return { isValid: false, error: 'Valid budget is required' }
  }

  return { isValid: true }
}

// Mock parlay generation logic (replace with your actual logic)
const generateMockParlay = (preferences: ParlayPreferences) => {
  const legs = [
    {
      type: 'player_prop',
      player: `${preferences.game.homeTeam} QB`,
      market: 'passing_yards',
      selection: 'over 250.5',
      odds: -110,
      reasoning: 'Strong offensive matchup',
    },
    {
      type: 'game_prop',
      team: preferences.game.awayTeam,
      market: 'team_total',
      selection: 'over 21.5',
      odds: -105,
      reasoning: 'Favorable weather conditions',
    },
  ]

  const totalOdds = legs.reduce((acc, leg) => {
    const decimalOdds =
      leg.odds > 0 ? leg.odds / 100 + 1 : 100 / Math.abs(leg.odds) + 1
    return acc * decimalOdds
  }, 1)

  return {
    legs,
    totalOdds: Math.round((totalOdds - 1) * 100), // Convert back to American odds
    potentialPayout:
      Math.round(preferences.options.budget * totalOdds * 100) / 100,
    confidence: 0.75,
    reasoning: `Generated ${legs.length}-leg parlay based on ${preferences.strategy.riskLevel} risk tolerance`,
    generatedAt: new Date().toISOString(),
    provider: 'mock',
  }
}

// Main parlay generation function
export const generateParlay = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
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

      const { provider, preferences } = req.body as RequestBody

      console.log('🎯 Generating parlay with:', {
        provider,
        riskLevel: preferences.strategy.riskLevel,
        budget: preferences.options.budget,
        game: `${preferences.game.awayTeam} @ ${preferences.game.homeTeam}`,
      })

      // Generate parlay based on provider
      let result
      switch (provider.toLowerCase()) {
        case 'openai':
          // TODO: Implement OpenAI integration
          result = generateMockParlay(preferences)
          result.provider = 'openai'
          break
        case 'claude':
          // TODO: Implement Claude integration
          result = generateMockParlay(preferences)
          result.provider = 'claude'
          break
        default:
          result = generateMockParlay(preferences)
          result.provider = 'mock'
      }

      console.log('✅ Parlay generated successfully:', result)

      res.status(200).json({
        success: true,
        data: result,
        metadata: {
          requestId: req.get('x-request-id') || 'unknown',
          timestamp: new Date().toISOString(),
          processingTime:
            Date.now() -
            (req.get('x-start-time')
              ? parseInt(req.get('x-start-time')!)
              : Date.now()),
        },
      })
    } catch (error) {
      console.error('❌ Error generating parlay:', error)

      res.status(500).json({
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      })
    }
  })
})

// Health check endpoint
export const health = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        firebase: 'connected',
        // Add other service checks here
      },
    })
  })
})

// Get game data endpoint
export const getGameData = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' })
        return
      }

      const { gameId } = req.body

      if (!gameId) {
        res.status(400).json({ error: 'Game ID is required' })
        return
      }

      // Mock game data (replace with actual data fetching)
      const gameData = {
        gameId,
        homeTeam: 'Chiefs',
        awayTeam: 'Bills',
        gameTime: '2024-01-15T18:00:00Z',
        venue: 'Arrowhead Stadium',
        weather: 'Clear, 45°F',
        odds: {
          spread: { home: -2.5, away: 2.5 },
          total: 47.5,
          moneyline: { home: -130, away: 110 },
        },
        injuries: [],
        lastUpdated: new Date().toISOString(),
      }

      res.status(200).json({
        success: true,
        data: gameData,
      })
    } catch (error) {
      console.error('Error fetching game data:', error)
      res.status(500).json({
        error: 'Failed to fetch game data',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })
})

// Get player stats endpoint
export const getPlayerStats = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' })
        return
      }

      const { playerId } = req.body

      if (!playerId) {
        res.status(400).json({ error: 'Player ID is required' })
        return
      }

      // Mock player stats (replace with actual data fetching)
      const playerStats = {
        playerId,
        name: 'Patrick Mahomes',
        position: 'QB',
        team: 'KC',
        season2024: {
          passingYards: 4183,
          touchdowns: 26,
          interceptions: 11,
          completionPercentage: 67.5,
          games: 16,
        },
        recentForm: {
          last5Games: {
            avgPassingYards: 245.6,
            touchdowns: 8,
            interceptions: 1,
          },
        },
        lastUpdated: new Date().toISOString(),
      }

      res.status(200).json({
        success: true,
        data: playerStats,
      })
    } catch (error) {
      console.error('Error fetching player stats:', error)
      res.status(500).json({
        error: 'Failed to fetch player stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })
})
