import type { ScheduleGame } from '../providers/espn/types'
import type { AIAnalysis } from '../service/ai/schemas'
import { impliedProbability } from '../utils/odds'
import type { ProcessedLeg } from './shared/schemas'

const MIN_ABS_ODDS = 100
const MAX_ABS_ODDS = 20_000

export interface ValidatableDraft {
  legs: ProcessedLeg[]
  analysisSummary: AIAnalysis
}

// What the run was created to produce, snapshotted from the user's tier. The
// prompt asks for exactly this shape, so validating against anything else would
// reject a draft that did as it was told.
export interface DraftConstraints {
  legCount: number
  playerProps: boolean
}

// Numbers are no longer checked against the book here — the orchestrator
// snaps a spread/total/moneyline leg's line and price to the book before
// this runs, so they're correct by construction whenever `anchored` is true.
// This checks structure only: is the leg internally sane, and did the model
// follow the player-name rule needed to grade the leg later.
export function validateDraft(
  draft: ValidatableDraft,
  game: ScheduleGame,
  constraints: DraftConstraints
): string[] {
  const issues: string[] = []
  const teams = [game.home.name, game.away.name]

  if (draft.legs.length !== constraints.legCount) {
    issues.push(`expected ${constraints.legCount} legs, got ${draft.legs.length}`)
  }

  draft.legs.forEach((leg, i) => {
    const at = `leg ${i + 1}`
    if (!teams.includes(leg.team)) {
      issues.push(`${at}: team "${leg.team}" is not in this game`)
    }
    if (!leg.selection.trim() || !leg.reasoning.trim()) {
      issues.push(`${at}: selection and reasoning are required`)
    }
    const abs = Math.abs(leg.odds)
    if (abs < MIN_ABS_ODDS || abs > MAX_ABS_ODDS) {
      issues.push(`${at}: odds ${leg.odds} outside sane range`)
    }
    // The model doesn't reliably emit a literal null here — an empty string
    // is common too — so treat both as "no player" in both directions.
    const isPlayerBet = leg.betType.startsWith('player_')
    const hasPlayer = !!leg.player?.trim()
    // Player props carry a model-estimated line rather than a posted one, so a
    // tier promised only book-anchored legs must not receive them. The prompt
    // already says so; this is the backstop for when the model does it anyway.
    if (isPlayerBet && !constraints.playerProps) {
      issues.push(`${at}: player props are not available on this plan`)
    }
    if (isPlayerBet && !hasPlayer) {
      issues.push(`${at}: ${leg.betType} requires a player name`)
    }
    if (!isPlayerBet && hasPlayer) {
      issues.push(`${at}: player must be empty for ${leg.betType}`)
    }
    // A leg anchored to the book's exact price has no edge if the model's
    // own confidence doesn't clear that price's break-even win rate.
    if (leg.anchored && leg.confidence <= impliedProbability(leg.odds)) {
      issues.push(
        `${at}: confidence ${leg.confidence} does not clear the implied probability of anchored odds ${leg.odds}`
      )
    }
  })

  for (const market of ['spread', 'moneyline', 'total'] as const) {
    const count = draft.legs.filter(l => l.betType === market).length
    if (count > 1) {
      issues.push(`${count} ${market} legs; at most one allowed`)
    }
  }

  const { gamePrediction } = draft.analysisSummary
  if (!teams.includes(gamePrediction.winner)) {
    issues.push(`predicted winner "${gamePrediction.winner}" is not in this game`)
  }
  if (gamePrediction.projectedScore.home < 0 || gamePrediction.projectedScore.away < 0) {
    issues.push('projected score cannot be negative')
  }

  return issues
}

// The issue strings above are developer-facing and go to `details`. This turns
// them into one sentence a user can act on.
//
// Every validation failure used to reach the user as "The model produced an
// invalid parlay" — the same eleven words for a leg-count mismatch, a leg with
// no price, and a player prop with no player. Three separate production faults
// wore that one string, which is why telling them apart took two sessions.
export function validationSummary(issues: string[]): string {
  const has = (fragment: string) => issues.some(i => i.includes(fragment))
  if (has('outside sane range')) {
    return 'The model returned a leg without a usable price.'
  }
  if (has('legs, got')) {
    return 'The model returned the wrong number of legs.'
  }
  if (has('requires a player name') || has('player must be empty')) {
    return 'The model returned a player prop without a player.'
  }
  if (has('is not in this game')) {
    return 'The model returned a leg for the wrong game.'
  }
  if (has('at most one allowed')) {
    return 'The model returned two legs for the same market.'
  }
  if (has('does not clear the implied probability')) {
    return 'The model had no edge over the book on one of its legs.'
  }
  return 'The model produced an invalid parlay.'
}
