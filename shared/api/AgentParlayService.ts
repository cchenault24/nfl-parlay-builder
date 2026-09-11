import { sharedRuntime } from '../runtime'
import type {
  AgentResult,
  Game,
  ParlayGenerationOptions,
  ParlayGenerationResult,
} from '../types'
import { AgentRunService, type RunStreamEvent } from './AgentRunService'
import { BaseParlayService } from './BaseParlayService'

export class AgentParlayService extends BaseParlayService {
  private readonly runs = new AgentRunService()

  async generateParlay(
    games: Game[],
    options: ParlayGenerationOptions
  ): Promise<ParlayGenerationResult> {
    const token = await sharedRuntime().getIdToken()
    if (!token) {
      throw new Error('You must be signed in to generate a parlay.')
    }
    if (games.length === 0) {
      throw new Error('Pick at least one game.')
    }

    const { runId, rateLimitInfo } = await this.runs.createRun({
      gameIds: games.map(g => g.gameId),
      riskLevel: options.riskLevel,
      bookmaker: options.bookmaker,
      legCount: options.legCount,
      token,
    })

    const result = await this.awaitResult(runId, token, options)

    return {
      // The server's own view of each game, not the caller's: it carries the
      // stats, odds and per-source status the run actually resolved.
      parlay: this.toParlay(
        runId,
        result.games.map(g => g.game),
        result.parlay,
        result.model
      ),
      games: result.games,
      rateLimitInfo,
      runId,
      serviceMode: 'agent',
    }
  }

  // Stream steps as they land; if the stream drops before a terminal event,
  // read the run once to learn how it ended rather than retrying the agent.
  private awaitResult(
    runId: string,
    token: string,
    options: ParlayGenerationOptions
  ): Promise<AgentResult> {
    return new Promise((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true
          stop()
          fn()
        }
      }

      const onEvent = (evt: RunStreamEvent) => {
        if (evt.type === 'step') {
          options.onStep?.(evt.data)
        } else if (evt.type === 'final') {
          settle(() => resolve(evt.data))
        } else if (evt.type === 'error') {
          settle(() => reject(new Error(evt.data.message || evt.data.code)))
        }
      }

      const onClose = async () => {
        if (settled) {
          return
        }
        try {
          const run = await this.runs.getRun(runId, token)
          if (run.status === 'succeeded' && run.result) {
            settle(() => resolve(run.result as AgentResult))
          } else if (run.status === 'failed' || run.status === 'canceled') {
            settle(() =>
              reject(new Error(run.error?.message || `Run ${run.status}`))
            )
          } else {
            settle(() =>
              reject(new Error('Lost connection while the agent was running.'))
            )
          }
        } catch (e) {
          settle(() => reject(e instanceof Error ? e : new Error(String(e))))
        }
      }

      const stop = this.runs.streamRun(runId, token, onEvent, onClose)

      options.signal?.addEventListener('abort', () => {
        settle(() => {
          // Closing the stream is what actually stops the run — it's the
          // request driving execution server-side, not just a display feed.
          // The explicit cancel call is a best-effort backstop for a run
          // being watched from another tab or device.
          stop()
          void this.runs.cancelRun(runId, token).catch(() => undefined)
          reject(new Error('Parlay generation canceled.'))
        })
      })
    })
  }
}
