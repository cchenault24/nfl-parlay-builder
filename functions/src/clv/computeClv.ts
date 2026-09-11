import type { GradableLeg } from '../grading/gradeLeg'
import type { LegClosingLine, ParlayClosingLines } from '../grading/types'
import type { ScheduleGame } from '../providers/espn/types'
import type { OddsSnapshot } from '../providers/odds/client'
import { bookPriceForLeg } from '../utils/bookLines'
import { impliedProbability } from '../utils/odds'

// A leg as stored on a saved parlay, carrying the price it was anchored at.
export type StoredLeg = GradableLeg & { odds: number; anchored?: boolean }

// A leg nobody has priced yet. Distinct from every other `unavailable` value in
// that it is temporary, and it is the sentinel the merge below uses to know
// which slots are still open.
const PENDING: LegClosingLine = {
  closingLine: null,
  closingOdds: null,
  clvPoints: null,
  bookmaker: null,
  unavailable: 'not_yet_closed',
}

function legClosingLine(
  leg: StoredLeg,
  game: ScheduleGame,
  closingOdds: OddsSnapshot | null
): LegClosingLine {
  const bookmaker = closingOdds?.bookmaker ?? null
  const empty = { closingLine: null, closingOdds: null, clvPoints: null, bookmaker }

  // A player prop was never priced by the book, so there is no close to beat.
  if (!leg.anchored) {
    return { ...empty, bookmaker: null, unavailable: 'unanchored' }
  }
  const priced = bookPriceForLeg(leg, game, closingOdds)
  if (!priced) {
    return { ...empty, unavailable: 'no_market' }
  }
  // A moved line means the closing price is for a different bet, so the two
  // numbers are not comparable — keep the close, but claim no CLV from it.
  if (leg.line !== null && priced.line !== null && leg.line !== priced.line) {
    return {
      closingLine: priced.line,
      closingOdds: priced.odds,
      clvPoints: null,
      bookmaker,
      unavailable: 'line_moved',
    }
  }
  const points = (impliedProbability(priced.odds) - impliedProbability(leg.odds)) * 100
  return {
    closingLine: priced.line,
    closingOdds: priced.odds,
    clvPoints: Math.round(points * 10) / 10,
    bookmaker,
  }
}

function averageOf(legs: LegClosingLine[]): number | null {
  const judged = legs.map(l => l.clvPoints).filter((p): p is number => p !== null)
  if (judged.length === 0) {
    return null
  }
  return Math.round((judged.reduce((a, b) => a + b, 0) / judged.length) * 10) / 10
}

/**
 * Prices the legs belonging to one game and folds them into whatever has been
 * captured already.
 *
 * A parlay does not have a single close. Each leg closes when *its own* game
 * kicks off, which for a cross-game parlay can be days apart — so this runs once
 * per game and leaves the other legs pending. A slot that has already been
 * priced is never recomputed: its game's market is gone, and re-reading it later
 * would silently replace a real close with a later, meaningless number.
 *
 * Which game a leg belongs to is derived from its team, the same way the agent
 * derives it when pricing the leg in the first place.
 */
export function mergeClosingLines(params: {
  legs: StoredLeg[]
  // Every game the parlay draws on, which is what says when it is finished.
  gameIds: string[]
  game: ScheduleGame
  closingOdds: OddsSnapshot | null
  existing?: ParlayClosingLines
}): ParlayClosingLines {
  const { legs, gameIds, game, closingOdds, existing } = params
  const teams = [game.home.name, game.away.name]

  const merged = legs.map((leg, i) => {
    const current = existing?.legs?.[i] ?? PENDING
    const open = current.unavailable === 'not_yet_closed'
    if (!open || !teams.includes(leg.team)) {
      return current
    }
    return legClosingLine(leg, game, closingOdds)
  })

  const capturedGameIds = existing?.capturedGameIds?.includes(game.gameId)
    ? existing.capturedGameIds
    : [...(existing?.capturedGameIds ?? []), game.gameId]

  return {
    capturedAt: new Date().toISOString(),
    capturedGameIds,
    // A missing game id here would leave a parlay permanently incomplete, so
    // this is deliberately computed from the parlay's own list rather than from
    // whether any leg is still pending — a leg naming a team in none of the
    // games would otherwise hold it open forever.
    complete: gameIds.every(id => capturedGameIds.includes(id)),
    legs: merged,
    averageClvPoints: averageOf(merged),
  }
}
