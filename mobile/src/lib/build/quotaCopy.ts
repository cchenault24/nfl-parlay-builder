import { RUN_DURATION_ESTIMATE } from '@shared/agentSteps'
import type { QuotaState } from '@shared/tiering'
import type { AgentGameResult } from '@shared/types'

// Billing is conditional: `finishRun` charges a generation only when the run
// succeeded *and* every game came back with real book prices. That makes two
// things worth saying out loud, and both are free-tier only — Pro has no
// counter to spend or credit.

/**
 * What a run will cost, said before the tap. The hedge is not caution, it is
 * the rule: a run that falls back to estimated prices is never billed.
 */
export function generationCostLine(quota: QuotaState | undefined): string | null {
  if (!quota || quota.limit === null || quota.remaining === null) {
    return null
  }
  if (quota.remaining === 0) {
    return `No parlays left this week. Your next ${quota.limit} arrive Tuesday.`
  }
  return `Counts as 1 of your ${quota.limit} parlays this week if it gets live book prices.`
}

/**
 * Said afterwards, when it turned out not to cost anything. Without this, a
 * user who receives a parlay and still has their full allowance reads it as a
 * bug or a lie — and it reframes the existing "Estimate" label from purely bad
 * news into a partial refund (DESIGN #17).
 */
export function unbilledNotice(
  games: AgentGameResult[] | undefined,
  quota: QuotaState | undefined
): string | null {
  if (!games?.length || !quota || quota.limit === null) {
    return null
  }
  if (games.every(g => g.sources.odds === 'ok')) {
    return null
  }
  return `Prices are AI estimates, so this one didn't count against your ${quota.limit} this week.`
}

// How long a run is likely to take, which stops being "20–60 seconds" as soon
// as a run can cover six games (CONTRACT §9.4).
export function waitEstimate(gameCount: number): string {
  if (gameCount <= 1) {
    return RUN_DURATION_ESTIMATE
  }
  const low = 20 + 10 * (gameCount - 1)
  const high = 60 + 20 * (gameCount - 1)
  return `${gameCount} games usually take ${low}–${high} seconds.`
}
