import type {
  GameRosters,
  GeneratedParlay,
  NFLGame,
  ParlayOptions,
} from '@npb/shared'

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
          type: 'spread',
          selection: `${game.homeTeam.abbreviation} -2.5`,
          threshold: -2.5,
          price: -110,
          rationale:
            'Placeholder leg while AI provider is being migrated to server',
        },
      ],
      notes: `strategy=${options?.strategy ?? 'balanced'}`,
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
