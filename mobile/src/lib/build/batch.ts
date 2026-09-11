import { runErrorCode } from '@shared/api/AgentRunService'
import { allowanceLabel, type Allowance } from '@shared/rateLimits'

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
 * A run is the unit the server charges in all three of its currencies — the
 * weekly quota, the daily valve and the hourly window — so the number that
 * matters is the one nearest to refusing you, which `bindingAllowance` picks.
 *
 * Selecting six games spends six runs in one tap. Discovering that when run
 * five is refused halfway through is the worst version of finding out, which is
 * the whole reason this line exists (DESIGN #22).
 */
export function batchCostLine(params: {
  mode: BatchMode
  gameCount: number
  allowance: Allowance | null
}): string {
  const { mode, gameCount, allowance } = params
  if (gameCount === 0) {
    return 'Pick at least one game.'
  }
  const runs = mode === 'cross' ? 1 : gameCount
  const plural = (n: number) => (n === 1 ? 'run' : 'runs')
  // Named whenever it is actually cheaper, and especially when the batch has
  // just been refused — that is the moment the alternative is worth knowing.
  const cheaper =
    mode === 'separate' && gameCount > 1 ? ' One cross-game parlay would use 1.' : ''

  if (!allowance) {
    return `Uses ${runs} ${plural(runs)}.${cheaper}`
  }
  const where = allowanceLabel(allowance.window)
  if (runs > allowance.remaining) {
    return `Needs ${runs} ${plural(runs)}; you have ${allowance.remaining} left ${where}.${cheaper}`
  }
  return `Uses ${runs} of your ${allowance.remaining} remaining ${plural(allowance.remaining)} ${where}.${cheaper}`
}

// Whether the tap should be refused outright rather than started and failed
// partway. What is left is knowable now, so spending half a batch to discover
// it is a choice nobody would make.
export function batchExceedsAllowance(params: {
  mode: BatchMode
  gameCount: number
  allowance: Allowance | null
}): boolean {
  const { mode, gameCount, allowance } = params
  if (!allowance) {
    return false
  }
  return (mode === 'cross' ? 1 : gameCount) > allowance.remaining
}
