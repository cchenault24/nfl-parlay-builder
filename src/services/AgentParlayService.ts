import {
  BetType,
  Game,
  GameData,
  LoadingPhaseUpdate,
  ParlayGenerationOptions,
  ParlayGenerationResult,
  ParlayLeg,
} from '../types'
import { AgentRunService } from './AgentRunService'
import { BaseParlayService } from './BaseParlayService'

export class AgentParlayService extends BaseParlayService {
  private readonly agentService: AgentRunService

  constructor() {
    super()
    this.agentService = new AgentRunService()
  }

  /**
   * Generate parlay using the agent system
   */
  async generateParlay(
    game: Game,
    options: ParlayGenerationOptions = {}
  ): Promise<ParlayGenerationResult> {
    try {
      const { onLoadingUpdate } = options
      const startTime = Date.now()

      // Get auth token (you'll need to implement this)
      const authToken = await this.getAuthToken()

      if (!authToken) {
        throw new Error(
          'No authentication token available. Please log in again.'
        )
      }

      // Phase 1: Starting Agent
      if (onLoadingUpdate) {
        onLoadingUpdate({
          phase: 'starting_agent',
          progress: 10,
          message: 'Initializing AI agent...',
          estimatedTimeRemaining: 45000,
        })
      }

      // Create game context from the selected game
      const gameContext = {
        gameId: game.gameId,
        week: game.week,
        dateTime: game.dateTime,
        status: game.status,
        home: {
          teamId: game.home.teamId,
          name: game.home.name,
          abbrev: game.home.abbrev,
          record: game.home.record,
          overallRecord: game.home.overallRecord,
          homeRecord: game.home.homeRecord,
          roadRecord: game.home.roadRecord,
        },
        away: {
          teamId: game.away.teamId,
          name: game.away.name,
          abbrev: game.away.abbrev,
          record: game.away.record,
          overallRecord: game.away.overallRecord,
          homeRecord: game.away.homeRecord,
          roadRecord: game.away.roadRecord,
        },
        venue: game.venue,
      }

      // Debug logging - Raw game data and context
      console.info('🎮 [AgentParlayService] Raw game data received:', {
        gameId: game.gameId,
        week: game.week,
        dateTime: game.dateTime,
        status: game.status,
        homeTeam: game.home.name,
        awayTeam: game.away.name,
        venue: game.venue,
      })

      console.info(
        '📋 [AgentParlayService] Game context being sent to agent:',
        JSON.stringify(gameContext, null, 2)
      )

      // Create agent run
      const { runId } = await this.agentService.createRun({
        gameId: game.gameId,
        gameContext,
        numLegs: 3,
        riskLevel: 'moderate',
        authToken,
      })

      // Phase 2: Agent Processing
      if (onLoadingUpdate) {
        onLoadingUpdate({
          phase: 'agent_processing',
          progress: 30,
          message: 'AI agent is analyzing game data...',
          estimatedTimeRemaining: 30000,
        })
      }

      // Wait for agent completion
      const result = await this.waitForAgentCompletion(runId, onLoadingUpdate)

      const latency = Date.now() - startTime

      return {
        parlay: result.parlay,
        gameData: result.gameData,
        toolResponses: result.toolResponses,
        rateLimitInfo: {
          remaining: 19, // Agent runs have different rate limits
          total: 20,
          resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          currentCount: 1,
        },
        metadata: this.createMetadata(
          'agent',
          'gpt-4o-mini',
          latency,
          result.parlay.parlayConfidence,
          {
            serviceMode: 'agent',
            runId,
            tokens: 0, // Agent doesn't expose token count
          }
        ),
      }
    } catch (error) {
      throw this.enhanceError(error as Error)
    }
  }

  private async waitForAgentCompletion(
    runId: string,
    onLoadingUpdate?: (update: LoadingPhaseUpdate) => void
  ): Promise<{
    parlay: {
      parlayId: string
      gameId: string
      gameContext: string
      legs: ParlayLeg[]
      combinedOdds: number
      parlayConfidence: number
      gameSummary: {
        matchupSummary: string
        keyFactors: string[]
        gamePrediction: {
          winner: string
          projectedScore: { home: number; away: number }
          winProbability: number
        }
      }
    }
    gameData: GameData
  }> {
    return new Promise((resolve, reject) => {
      let pollCount = 0
      const maxPolls = 60 // 5 minutes max
      const pollInterval = 5000 // 5 seconds

      const poll = async () => {
        try {
          const run = await this.agentService.getRun(runId, {
            token: await this.getAuthToken(),
          })

          if (run.status === 'succeeded' && run.result) {
            // Convert agent result to parlay format
            const parlay = {
              parlayId: `agent-${runId}`,
              gameId: runId,
              gameContext: JSON.stringify(run.result.analysisSummary),
              legs: run.result.legs.map(
                (leg): ParlayLeg => ({
                  betType: leg.betType as BetType,
                  selection: leg.selection,
                  odds: leg.odds,
                  confidence: leg.confidence,
                  reasoning: leg.reasoning,
                  team: leg.team,
                })
              ),
              combinedOdds: run.result.legs.reduce(
                (acc, leg) => acc * leg.odds,
                1
              ),
              parlayConfidence:
                run.result.analysisSummary.gamePrediction.winProbability,
              gameSummary: {
                matchupSummary: run.result.analysisSummary.matchupSummary,
                keyFactors: run.result.analysisSummary.keyFactors,
                gamePrediction: run.result.analysisSummary.gamePrediction,
              },
            }

            const gameData: GameData = {
              gameId: runId,
              week: 1, // You'll need to get this from somewhere
              dateTime: new Date().toISOString(),
              status: 'scheduled',
              home: {
                teamId: 'home-team-id',
                name: 'Home Team',
                abbrev: 'HT',
                record: '0-0',
                overallRecord: '0-0',
                homeRecord: '0-0',
                roadRecord: '0-0',
                stats: null,
                roster: [],
              },
              away: {
                teamId: 'away-team-id',
                name: 'Away Team',
                abbrev: 'AT',
                record: '0-0',
                overallRecord: '0-0',
                homeRecord: '0-0',
                roadRecord: '0-0',
                stats: null,
                roster: [],
              },
              venue: { name: 'Stadium', city: 'City', state: 'State' },
            }

            resolve({ parlay, gameData })
            return
          }

          if (run.status === 'failed') {
            reject(new Error(run.error?.message || 'Agent run failed'))
            return
          }

          // Update progress
          if (onLoadingUpdate) {
            const progress = Math.min(30 + pollCount * 2, 90)
            onLoadingUpdate({
              phase: 'agent_processing',
              progress,
              message: 'AI agent is analyzing game data...',
              estimatedTimeRemaining: (maxPolls - pollCount) * 5,
            })
          }

          pollCount++
          if (pollCount >= maxPolls) {
            reject(new Error('Agent run timed out'))
            return
          }

          setTimeout(poll, pollInterval)
        } catch (error) {
          reject(error)
        }
      }

      poll()
    })
  }

  private async getAuthToken(): Promise<string | undefined> {
    // You'll need to implement this based on your auth system
    // This is a placeholder
    return undefined
  }

  async checkServiceHealth(): Promise<{
    healthy: boolean
    mode: 'mock' | 'openai' | 'agent'
    providers?: Array<{
      name: string
      healthy: boolean
      latency?: number
      lastError?: string
    }>
    timestamp: string
  }> {
    return {
      healthy: true,
      mode: 'agent',
      providers: [
        {
          name: 'agent',
          healthy: true,
        },
      ],
      timestamp: new Date().toISOString(),
    }
  }

  getServiceMode(): 'mock' | 'openai' | 'agent' {
    return 'agent'
  }

  isConfigured(): boolean {
    return true // Agent service is always configured
  }
}
