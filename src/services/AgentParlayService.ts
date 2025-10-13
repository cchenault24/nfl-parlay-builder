import {
  BetType,
  Game,
  GameContext,
  GameData,
  GeneratedParlay,
  LoadingPhaseUpdate,
  ParlayGenerationOptions,
  ParlayGenerationResult,
  ParlayLeg,
  ToolResponses,
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

      // Create minimal game context - agent tools will discover venue and team data
      const gameContext: GameContext = {
        gameId: game.gameId,
        week: game.week,
        dateTime: game.dateTime,
        status: game.status,
        home: {
          teamId: game.home.teamId,
          name: game.home.name,
          abbrev: game.home.abbrev,
        },
        away: {
          teamId: game.away.teamId,
          name: game.away.name,
          abbrev: game.away.abbrev,
        },
      }

      // Debug logging - Raw game data and context
      console.info('🎮 [AgentParlayService] Raw game data received:', {
        gameId: game.gameId,
        week: game.week,
        dateTime: game.dateTime,
        status: game.status,
        homeTeam: game.home.name,
        awayTeam: game.away.name,
      })

      console.info(
        '📋 [AgentParlayService] Minimal game context being sent to agent:',
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
        toolResponses: result.toolResponses || undefined,
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
    parlay: GeneratedParlay
    gameData: GameData
    toolResponses?: ToolResponses
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
            // The run.result contains the full enhanced result with parlay, gameData, and toolResponses
            const agentResult = run.result as unknown as {
              parlay: {
                legs: Array<{
                  betType: string
                  selection: string
                  odds: number
                  confidence: number
                  reasoning: string
                  team: string
                }>
                analysisSummary: {
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
              toolResponses?: ToolResponses
            }

            const parlay: GeneratedParlay = {
              parlayId: `agent-${runId}`,
              gameId: runId,
              gameContext: JSON.stringify(agentResult.parlay.analysisSummary),
              legs: agentResult.parlay.legs.map(
                (leg): ParlayLeg => ({
                  betType: leg.betType as BetType,
                  selection: leg.selection,
                  odds: leg.odds,
                  confidence: leg.confidence,
                  reasoning: leg.reasoning,
                  team: leg.team,
                })
              ),
              combinedOdds: agentResult.parlay.legs.reduce(
                (acc, leg) => acc * leg.odds,
                1
              ),
              parlayConfidence:
                agentResult.parlay.analysisSummary.gamePrediction
                  .winProbability,
              gameSummary: {
                matchupSummary:
                  agentResult.parlay.analysisSummary.matchupSummary,
                keyFactors: agentResult.parlay.analysisSummary.keyFactors,
                gamePrediction:
                  agentResult.parlay.analysisSummary.gamePrediction,
              },
            }

            // Use the gameData from the agent result
            const gameData: GameData = agentResult.gameData

            // Get toolResponses from the agent result
            const toolResponses = agentResult.toolResponses

            console.info('🤖 [AgentParlayService] Agent run completed:', {
              runId,
              status: run.status,
              hasResult: !!run.result,
              resultKeys: run.result ? Object.keys(run.result) : [],
              parlayLegs: agentResult.parlay.legs?.length || 0,
              toolResponses,
            })

            // Debug: Log the full agent result structure
            console.info(
              '🔍 [AgentParlayService] Full agent result structure:',
              {
                hasParlay: !!agentResult.parlay,
                parlayKeys: agentResult.parlay
                  ? Object.keys(agentResult.parlay)
                  : [],
                parlayLegs: agentResult.parlay?.legs,
                hasGameData: !!agentResult.gameData,
                hasToolResponses: !!agentResult.toolResponses,
                toolResponsesKeys: agentResult.toolResponses
                  ? Object.keys(agentResult.toolResponses)
                  : [],
              }
            )

            resolve({
              parlay,
              gameData,
              toolResponses: toolResponses || undefined,
            })
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
    try {
      const { auth } = await import('../config/firebase')
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.warn('No authenticated user found')
        return undefined
      }

      // Check if user is still valid
      if (!currentUser.emailVerified && currentUser.providerData.length === 0) {
        console.warn('User account may be invalid')
        return undefined
      }

      // Get the ID token, which will refresh if needed
      const token = await currentUser.getIdToken()
      return token
    } catch (error) {
      console.error('Error getting auth token:', error)
      return undefined
    }
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
