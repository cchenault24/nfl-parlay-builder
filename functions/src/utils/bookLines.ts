import type { ScheduleGame } from '../providers/espn/types'
import type { OddsSnapshot } from '../providers/odds/client'
export interface BookPrice {
  line: number | null
  odds: number
}

// betType stays a plain string so stored parlays, whose types are loose on
// the way back out of Firestore, can be priced without re-narrowing: anything
// that is not a market this book posts simply returns null.
export interface PriceableLeg {
  betType: string
  team: string
  side: 'over' | 'under' | null
}

// What the book is showing for this leg right now, or null when it posts no
// such market (and always for player props, which this app gets no lines for).
//
// Shared by the draft-time snap and the closing-line capture so that an
// opening and a closing price are always read the same way — a comparison
// between the two is meaningless otherwise.
export function bookPriceForLeg(
  leg: PriceableLeg,
  game: ScheduleGame,
  odds: OddsSnapshot | null
): BookPrice | null {
  const isHome = leg.team === game.home.name

  if (leg.betType === 'spread' && odds?.spread) {
    return {
      line: isHome ? odds.spread.line : -odds.spread.line,
      odds: isHome ? odds.spread.homePrice : odds.spread.awayPrice,
    }
  }
  if (leg.betType === 'moneyline' && odds?.moneyline) {
    return {
      line: null,
      odds: isHome ? odds.moneyline.home : odds.moneyline.away,
    }
  }
  if (leg.betType === 'total' && odds?.total && leg.side) {
    return {
      line: odds.total.line,
      odds: leg.side === 'over' ? odds.total.overPrice : odds.total.underPrice,
    }
  }
  return null
}
