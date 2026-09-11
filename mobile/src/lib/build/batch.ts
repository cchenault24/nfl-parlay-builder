import { runErrorCode } from '@shared/api/AgentRunService'

// Select mode's two products. They are genuinely different — one parlay per
// game versus one parlay across games — and they cost differently, which is the
// whole reason the bar names both (DESIGN #12, #22).
export type BatchMode = 'separate' | 'cross'

export interface BatchOutcome {
  succeeded: string[][]
  failed: { gameIds: string[]; error: string }[]
  // Games the batch never got to, because a rate limit refused the run that
  // would have created them. Firing the rest would only produce more refusals.
  skipped: string[][]
  stoppedBy?: string
}

// How a selection turns into runs. `cross` is one run over every game; separate
// is one run per game.
export function batchGroups(mode: BatchMode, gameIds: string[]): string[][] {
  return mode === 'cross' ? [gameIds] : gameIds.map(id => [id])
}

/**
 * Runs a batch **one at a time**.
 *
 * Not a throttling choice: execution rides the SSE request, so N concurrent
 * runs means N held-open connections and N Cloud Run instance-seconds
 * (CONTRACT §0). Sequential is the only shape the transport actually supports.
 *
 * A failed run does not stop the batch — a partially failed batch is a normal
 * outcome and the earlier results stand. A *rate-limited* run does stop it:
 * every remaining run would be refused identically, and five more failed rows
 * tell the user nothing the first one did not.
 */
export async function runBatch(
  groups: string[][],
  run: (gameIds: string[]) => Promise<unknown>
): Promise<BatchOutcome> {
  const outcome: BatchOutcome = { succeeded: [], failed: [], skipped: [] }

  for (const [index, gameIds] of groups.entries()) {
    try {
      await run(gameIds)
      outcome.succeeded.push(gameIds)
    } catch (error) {
      const code = runErrorCode(error)
      if (code === 'rate_limited') {
        outcome.stoppedBy = code
        outcome.skipped = groups.slice(index)
        return outcome
      }
      outcome.failed.push({
        gameIds,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return outcome
}

/**
 * What the batch bar says the tap will cost, before the tap.
 *
 * A run is the unit the server charges in both currencies — one against the
 * weekly quota, one against the daily valve — so stating the run count and
 * naming the cheaper mode is what makes the choice legible. The daily
 * allowance itself is not stated: the server does not serve it, and inventing
 * a number the client cannot verify would be worse than saying nothing.
 */
export function batchCostLine(params: {
  mode: BatchMode
  gameCount: number
  quotaRemaining: number | null | undefined
}): string {
  const { mode, gameCount, quotaRemaining } = params
  if (gameCount === 0) {
    return 'Pick at least one game.'
  }
  const runs = mode === 'cross' ? 1 : gameCount
  const plural = (n: number) => (n === 1 ? 'run' : 'runs')

  if (quotaRemaining !== null && quotaRemaining !== undefined) {
    if (runs > quotaRemaining) {
      return `Needs ${runs} ${plural(runs)}; you have ${quotaRemaining} left this week.`
    }
    return `Uses ${runs} of your ${quotaRemaining} remaining ${plural(quotaRemaining)} this week.`
  }
  if (mode === 'separate' && gameCount > 1) {
    return `Uses ${runs} runs · one cross-game parlay would use 1.`
  }
  return `Uses ${runs} ${plural(runs)}.`
}

// Whether the tap should be refused outright rather than started and failed
// partway. A quota that cannot cover the batch is knowable now.
export function batchExceedsQuota(params: {
  mode: BatchMode
  gameCount: number
  quotaRemaining: number | null | undefined
}): boolean {
  const { mode, gameCount, quotaRemaining } = params
  if (quotaRemaining === null || quotaRemaining === undefined) {
    return false
  }
  return (mode === 'cross' ? 1 : gameCount) > quotaRemaining
}
