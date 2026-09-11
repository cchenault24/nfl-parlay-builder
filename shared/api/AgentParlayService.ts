import { sharedRuntime } from '../runtime'
import type {
  AgentResult,
  Game,
  ParlayGenerationOptions,
  ParlayGenerationResult,
} from '../types'
import { AgentRunService, type RunStreamEvent } from './AgentRunService'
import { BaseParlayService } from './BaseParlayService'

// The Cloud Function's own timeout: nothing can still be running past it.
export const STREAM_DEADLINE_MS = 300_000

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

    const { runId, rateLimit } = await this.runs.createRun({
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
      ...(rateLimit ? { rateLimit } : {}),
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
    // A cancel that landed while the run was still being created has nothing
    // to abort yet, and an `abort` listener added now would never fire. Left
    // alone, the stream would open and drive the run to a billable end whose
    // result nobody was waiting for.
    if (options.signal?.aborted) {
      void this.runs.cancelRun(runId, token).catch(() => undefined)
      return Promise.reject(new Error('Parlay generation canceled.'))
    }

    return new Promise((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true
          clearTimeout(deadline)
          stop()
          fn()
        }
      }

      // The token was minted when the run began and a run can outlive its
      // remaining life; reconciling with a stale one turned a finished, billed
      // run into "Authentication failed".
      const freshToken = async () => (await sharedRuntime().getIdToken()) ?? token

      const onEvent = (evt: RunStreamEvent) => {
        if (evt.type === 'step') {
          options.onStep?.(evt.data)
        } else if (evt.type === 'draft') {
          options.onDraft?.(evt.data)
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
          const run = await this.runs.getRun(runId, await freshToken())
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

      // A socket that is neither delivering nor closing — an evicted instance,
      // a middlebox holding the connection — would otherwise leave the entry
      // "running" until the next relaunch. The server's own ceiling is the
      // function timeout, so past it the run has ended one way or the other and
      // the stored run says which.
      const deadline = setTimeout(() => {
        stop()
        void onClose()
      }, STREAM_DEADLINE_MS)

      options.signal?.addEventListener('abort', () => {
        settle(() => {
          // Closing the stream is what actually stops the run — it's the
          // request driving execution server-side, not just a display feed.
          // The explicit cancel call is a best-effort backstop for a run
          // being watched from another tab or device.
          stop()
          void freshToken()
            .then(fresh => this.runs.cancelRun(runId, fresh))
            .catch(() => undefined)
          reject(new Error('Parlay generation canceled.'))
        })
      })
    })
  }
}
