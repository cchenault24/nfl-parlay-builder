import {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  ParlayOptions,
} from '../../types'

export class StubAIService {
  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    options?: ParlayOptions
  ): Promise<{
    parlay: GeneratedParlay
    metadata: {
      provider: string
      model: string
      latency: number
      confidence: number
    }
  }> {
    // Minimal placeholder so end-to-end compiles and runs
    const started = Date.now()
    const parlay: GeneratedParlay = {
      gameId: game.id,
      legs: [
        {
          betType: 'spread',
          selection: `${game.homeTeam.abbreviation} -2.5`,
          target: '-2.5',
          odds: '-110',
          reasoning:
            'Placeholder leg while AI provider is being migrated to server',
          confidence: 5,
          id: 'id',
        },
      ],
    }
    return {
      parlay,
      metadata: {
        provider: 'stub',
        model: 'stub-0',
        latency: Date.now() - started,
        confidence: 0.5,
      },
    }
  }
}

export default StubAIService
