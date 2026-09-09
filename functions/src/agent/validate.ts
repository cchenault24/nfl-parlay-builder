import type { ScheduleGame } from '../providers/espn/types'
import type { OddsSnapshot } from '../providers/odds/client'
import type { AIGenerateResponse, AILeg } from '../service/ai/schemas'

const MIN_ABS_ODDS = 100
const MAX_ABS_ODDS = 20_000
const EPSILON = 1e-6

function same(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON
}

function anchorIssues(
  leg: AILeg,
  index: number,
  game: ScheduleGame,
  odds: OddsSnapshot
): string[] {
  const isHome = leg.team === game.home.name
  const at = `leg ${index + 1}`
  const issues: string[] = []

  if (leg.betType === 'spread') {
    if (!odds.spread) {
      issues.push(`${at}: spread market has no book line for this game`)
    } else {
      const expectedLine = isHome ? odds.spread.line : -odds.spread.line
      const expectedPrice = isHome ? odds.spread.homePrice : odds.spread.awayPrice
      if (leg.line === null || !same(leg.line, expectedLine)) {
        issues.push(`${at}: spread line ${leg.line} != book ${expectedLine}`)
      }
      if (leg.odds !== expectedPrice) {
        issues.push(`${at}: spread price ${leg.odds} != book ${expectedPrice}`)
      }
    }
  }
  if (leg.betType === 'moneyline') {
    if (!odds.moneyline) {
      issues.push(`${at}: moneyline market has no book line for this game`)
    } else {
      const expectedPrice = isHome ? odds.moneyline.home : odds.moneyline.away
      if (leg.odds !== expectedPrice) {
        issues.push(`${at}: moneyline ${leg.odds} != book ${expectedPrice}`)
      }
    }
  }
  if (leg.betType === 'total') {
    if (!odds.total) {
      issues.push(`${at}: total market has no book line for this game`)
    } else if (!leg.side) {
      issues.push(`${at}: total leg needs a side`)
    } else {
      if (leg.line === null || !same(leg.line, odds.total.line)) {
        issues.push(`${at}: total ${leg.line} != book ${odds.total.line}`)
      }
      const expectedPrice =
        leg.side === 'over' ? odds.total.overPrice : odds.total.underPrice
      if (leg.odds !== expectedPrice) {
        issues.push(`${at}: total price ${leg.odds} != book ${expectedPrice}`)
      }
    }
  }
  return issues
}

export function validateDraft(
  draft: AIGenerateResponse,
  game: ScheduleGame,
  odds: OddsSnapshot | null
): string[] {
  const issues: string[] = []
  const teams = [game.home.name, game.away.name]

  if (draft.legs.length !== 3) {
    issues.push(`expected 3 legs, got ${draft.legs.length}`)
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
    // Anchor a market leg to its book line whenever any book data exists for
    // this game — a leg using a market the book hasn't posted (e.g. total
    // missing while spread/moneyline are live) is exactly as invented as a
    // leg contradicting a line the book did post, so both are rejected here.
    if (odds && teams.includes(leg.team)) {
      issues.push(...anchorIssues(leg, i, game, odds))
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
