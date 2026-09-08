import type {
  AgentStep,
  Game,
  ParlayGenerationOptions,
  ParlayGenerationResult,
} from '../types'
import { BaseParlayService } from './BaseParlayService'
import { ParlayMock } from './ParlayMock'

const STEP_SEQUENCE: Array<{
  type: AgentStep['type']
  tool?: AgentStep['tool']
  ms: number
}> = [
  { type: 'plan', ms: 150 },
  { type: 'tool', tool: 'espn_game', ms: 350 },
  { type: 'tool', tool: 'espn_team_stats', ms: 600 },
  { type: 'tool', tool: 'odds', ms: 450 },
  { type: 'draft', ms: 1200 },
  { type: 'validate', ms: 200 },
]

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new Error('Parlay generation canceled.'))
    })
  })

export class MockParlayService extends BaseParlayService {
  async generateParlay(
    game: Game,
    options: ParlayGenerationOptions
  ): Promise<ParlayGenerationResult> {
    for (const s of STEP_SEQUENCE) {
      const id = `step_${s.type}${s.tool ? `_${s.tool}` : ''}`
      const startedAt = new Date().toISOString()
      options.onStep?.({ id, type: s.type, tool: s.tool, status: 'running', startedAt })
      await wait(s.ms, options.signal)
      options.onStep?.({
        id,
        type: s.type,
        tool: s.tool,
        status: 'ok',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: s.ms,
      })
    }

    const mock = ParlayMock.generate(game)
    return {
      parlay: this.toParlay(`mock_${game.gameId}`, game, mock.parlay, 'mock'),
      game,
      homeStats: mock.homeStats,
      awayStats: mock.awayStats,
      odds: mock.odds,
      sources: { stats: 'ok', odds: 'ok', weather: game.weather ? 'ok' : 'unavailable' },
      serviceMode: 'mock',
    }
  }
}
