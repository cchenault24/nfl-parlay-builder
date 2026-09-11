import type { AgentStep } from './types'

// The eight conceptual steps a run reports, in order. Six games must not become
// forty-eight rows (CONTRACT §9.3) — a multi-game run counts through the games
// *inside* a row instead.
//
// These ids are a server contract, not presentation: `functions/` emits them and
// both clients match on them. They lived in two hand-kept copies, one per
// client, so renaming a step server-side silently broke whichever client was not
// updated — the timeline fell through to a bare "Working" and the progress rule
// divided by the wrong denominator, with no type error anywhere to catch it.
//
// `optional` steps are allowed to fail without failing the run: they render as
// "unavailable — continuing" rather than as an error, or a degraded run looks
// broken.
export interface StepRow {
  id: string
  label: string
  optional?: boolean
}

export const STEP_ROWS: StepRow[] = [
  { id: 'step_plan', label: 'Plan the run' },
  { id: 'step_tool_espn_game', label: 'Load game, venue & forecast' },
  { id: 'step_tool_espn_team_stats', label: 'Pull team statistics', optional: true },
  { id: 'step_tool_espn_pregame', label: 'Check injuries & recent form', optional: true },
  { id: 'step_tool_nflverse_epa', label: 'Pull EPA efficiency stats', optional: true },
  { id: 'step_tool_odds', label: 'Fetch book lines', optional: true },
  { id: 'step_draft', label: 'Draft the parlay' },
  { id: 'step_validate', label: 'Check legs against the lines' },
]

const LABELS = new Map(STEP_ROWS.map(row => [row.id, row.label]))

// A step id the shipped client does not know about. A binary keeps running
// against a server that moves on, which is routine for an App Store release, so
// this is a real path rather than a defensive one.
export function stepLabel(id: string): string | undefined {
  return LABELS.get(id)
}

// "4 of 6", or nothing at all for a single-game run — where `progress` is
// deliberately undefined and the row reads exactly as it always has.
export function stepProgressLabel(step: AgentStep | undefined): string | undefined {
  return step?.progress ? `${step.progress.done} of ${step.progress.total}` : undefined
}

/**
 * What a compact row — one line on the Build list, not the eight-row
 * timeline — should say a run is doing right now. The running step if there is
 * one, otherwise the last one to have finished, so the label never blanks
 * between steps.
 */
export function currentStepLabel(steps: AgentStep[]): string {
  const running = steps.find(s => s.status === 'running')
  if (running) {
    const progress = stepProgressLabel(running)
    const label = stepLabel(running.id) ?? 'Working'
    return progress ? `${label} · ${progress}` : label
  }
  const last = steps[steps.length - 1]
  return last ? (stepLabel(last.id) ?? 'Working') : 'Starting'
}

// How far through the eight steps a run is, for the thin rule on a running row.
export function stepFraction(steps: AgentStep[]): number {
  const done = steps.filter(s => s.status === 'ok' || s.status === 'failed').length
  return Math.min(1, done / STEP_ROWS.length)
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

// One sentence, in one place. The web timeline and the mobile wait estimate both
// stated this number, so a change to the agent's real duration had to be made
// twice to stop the two clients disagreeing.
export const RUN_DURATION_ESTIMATE = 'Runs usually take 20–60 seconds.'

/**
 * What the right-hand side of a timeline row says: the failure, the progress
 * count, or how long the step took.
 *
 * Four mutually exclusive outcomes, previously resolved by nested ternaries
 * inside JSX. An optional step that failed reads as "unavailable — continuing"
 * rather than as an error, because a degraded run is not a broken one — and
 * getting that branch wrong presents a mandatory failure as benign.
 */
export function stepMeta(
  step: AgentStep | undefined,
  row: StepRow
): { text: string; failed: boolean } {
  if (step?.status === 'failed') {
    return {
      failed: true,
      text: row.optional
        ? 'unavailable — continuing'
        : (step.error?.message ?? 'failed'),
    }
  }
  const progress = stepProgressLabel(step)
  if (progress) {
    return { failed: false, text: progress }
  }
  if (step?.durationMs !== undefined) {
    return { failed: false, text: `${(step.durationMs / 1000).toFixed(1)}s` }
  }
  return { failed: false, text: '' }
}
