import { BaseParlayService } from '@shared/api/BaseParlayService'
import type {
  AgentStep,
  Game,
  ParlayGenerationOptions,
  ParlayGenerationResult,
} from '../types'
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
    games: Game[],
    options: ParlayGenerationOptions
  ): Promise<ParlayGenerationResult> {
    const total = games.length
    for (const s of STEP_SEQUENCE) {
      const id = `step_${s.type}${s.tool ? `_${s.tool}` : ''}`
      const startedAt = new Date().toISOString()
      // Mirrors the real agent: a tool step that spans several games counts
      // through them, and a single-game run reports no progress at all.
      const progress = s.type === 'tool' && total > 1 ? { done: 0, total } : undefined
      options.onStep?.({
        id,
        type: s.type,
        tool: s.tool,
        status: 'running',
        startedAt,
        progress,
      })
      await wait(s.ms, options.signal)
      options.onStep?.({
        id,
        type: s.type,
        tool: s.tool,
        status: 'ok',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: s.ms,
        ...(progress ? { progress: { done: total, total } } : {}),
      })
    }

    // One mock per game, with the first game's legs standing in for the parlay:
    // the mock exists to exercise the UI's shapes, not to invent a plausible
    // cross-game parlay.
    const mocks = games.map(game => ({ game, ...ParlayMock.generate(game) }))
    const [first] = mocks
    return {
      parlay: this.toParlay(
        `mock_${games.map(g => g.gameId).join('+')}`,
        games,
        {
          ...first.parlay,
          gameSummary: {
            games: mocks.flatMap(m => m.parlay.gameSummary.games),
            slateSummary:
              total > 1 ? `Mock slate summary across ${total} games.` : null,
          },
        },
        'mock'
      ),
      games: mocks.map(({ game, homeStats, awayStats, odds }) => ({
        game,
        homeStats,
        awayStats,
        odds,
        sources: {
          stats: 'ok' as const,
          odds: 'ok' as const,
          weather: game.weather ? ('ok' as const) : ('unavailable' as const),
        },
      })),
      serviceMode: 'mock',
    }
  }
}
