import type { AgentStep } from '@shared/types'

// The eight conceptual steps a run reports, in order. Six games must not become
// forty-eight rows (CONTRACT §9.3) — a multi-game run counts through the games
// *inside* a row instead.
//
// `optional` steps are allowed to fail without failing the run: they render as
// "unavailable — continuing" rather than as an error, or a degraded run looks
// broken.
export const STEP_ROWS: { id: string; label: string; optional?: boolean }[] = [
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
    const label = LABELS.get(running.id) ?? 'Working'
    return progress ? `${label} · ${progress}` : label
  }
  const last = steps[steps.length - 1]
  return last ? (LABELS.get(last.id) ?? 'Working') : 'Starting'
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
