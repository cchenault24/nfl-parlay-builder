import type { GradableLeg } from '../grading/gradeLeg'
import type { LegClosingLine, ParlayClosingLines } from '../grading/types'
import type { ScheduleGame } from '../providers/espn/types'
import type { OddsSnapshot } from '../providers/odds/client'
import { bookPriceForLeg } from '../utils/bookLines'
import { impliedProbability } from '../utils/odds'

// A leg as stored on a saved parlay, carrying the price it was anchored at.
export type StoredLeg = GradableLeg & { odds: number; anchored?: boolean }

function legClosingLine(
  leg: StoredLeg,
  game: ScheduleGame,
  closingOdds: OddsSnapshot | null
): LegClosingLine {
  const empty = { closingLine: null, closingOdds: null, clvPoints: null }

  // A player prop was never priced by the book, so there is no close to beat.
  if (!leg.anchored) {
    return { ...empty, unavailable: 'unanchored' }
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
      unavailable: 'line_moved',
    }
  }
  const points = (impliedProbability(priced.odds) - impliedProbability(leg.odds)) * 100
  return {
    closingLine: priced.line,
    closingOdds: priced.odds,
    clvPoints: Math.round(points * 10) / 10,
  }
}

export function computeClosingLines(
  legs: StoredLeg[],
  game: ScheduleGame,
  closingOdds: OddsSnapshot | null
): ParlayClosingLines {
  const perLeg = legs.map(leg => legClosingLine(leg, game, closingOdds))
  const judged = perLeg.map(l => l.clvPoints).filter((p): p is number => p !== null)
  return {
    capturedAt: new Date().toISOString(),
    bookmaker: closingOdds?.bookmaker ?? null,
    legs: perLeg,
    averageClvPoints:
      judged.length > 0
        ? Math.round((judged.reduce((a, b) => a + b, 0) / judged.length) * 10) / 10
        : null,
  }
}
