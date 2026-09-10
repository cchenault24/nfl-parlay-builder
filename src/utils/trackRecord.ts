import type { GeneratedParlay, LegOutcome, ParlayOutcome } from '../types'

export interface Tally {
  won: number
  lost: number
  push: number
  // Graded outcomes only — pending and ungraded legs are excluded, since
  // counting them as losses would understate a record that isn't in yet.
  settled: number
  winRate: number | null
}

export interface ConfidenceBand {
  label: string
  // What the model claimed, averaged across the legs in this band.
  statedConfidence: number
  // What actually happened.
  actualWinRate: number | null
  legs: number
}

export interface TrackRecord {
  parlays: Tally
  legs: Tally
  byBetType: Array<{ betType: string } & Tally>
  byConfidence: ConfidenceBand[]
  averageClvPoints: number | null
  clvJudgedLegs: number
  // Not yet gradeable, plus those graded 'partial' — a partial has a leg that
  // could not be graded at all, so it has no settled result to report and
  // would otherwise disappear from both the record and the pending count.
  unresolvedParlays: number
}

const BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: 'Under 55%', min: 0, max: 0.55 },
  { label: '55-65%', min: 0.55, max: 0.65 },
  { label: '65-75%', min: 0.65, max: 0.75 },
  { label: '75%+', min: 0.75, max: 1.01 },
]

function tally(outcomes: Array<LegOutcome | ParlayOutcome>): Tally {
  const won = outcomes.filter(o => o === 'won').length
  const lost = outcomes.filter(o => o === 'lost').length
  const push = outcomes.filter(o => o === 'push').length
  // A push returns the stake, so it belongs in neither column of a win rate.
  const decided = won + lost
  return {
    won,
    lost,
    push,
    settled: won + lost + push,
    winRate: decided > 0 ? won / decided : null,
  }
}

// Everything the history view reports, derived from the parlays the client
// already holds. Deliberately a pure function of that list: no endpoint, no
// second source of truth to fall out of step with what's on screen.
export function computeTrackRecord(parlays: GeneratedParlay[]): TrackRecord {
  const graded = parlays.filter(p => p.grading?.status === 'graded')

  const parlayOutcomes = graded
    .map(p => p.grading?.parlayOutcome)
    .filter((o): o is ParlayOutcome => !!o && o !== 'partial')

  const legRows = graded.flatMap(p =>
    (p.grading?.legOutcomes ?? []).map((outcome, i) => ({
      outcome,
      leg: p.legs[i],
    }))
  )
  const settledLegs = legRows.filter(r => r.leg && r.outcome !== 'ungraded')

  const betTypes = [...new Set(settledLegs.map(r => r.leg.betType))].sort()

  const clvPoints = parlays
    .flatMap(p => p.closingLines?.legs ?? [])
    .map(l => l.clvPoints)
    .filter((p): p is number => p !== null && p !== undefined)

  return {
    parlays: tally(parlayOutcomes),
    legs: tally(settledLegs.map(r => r.outcome)),
    byBetType: betTypes.map(betType => ({
      betType,
      ...tally(
        settledLegs.filter(r => r.leg.betType === betType).map(r => r.outcome)
      ),
    })),
    byConfidence: BANDS.map(band => {
      const inBand = settledLegs.filter(
        r => r.leg.confidence >= band.min && r.leg.confidence < band.max
      )
      const t = tally(inBand.map(r => r.outcome))
      return {
        label: band.label,
        statedConfidence:
          inBand.length > 0
            ? inBand.reduce((sum, r) => sum + r.leg.confidence, 0) / inBand.length
            : 0,
        actualWinRate: t.winRate,
        legs: inBand.length,
      }
    }).filter(b => b.legs > 0),
    averageClvPoints:
      clvPoints.length > 0
        ? Math.round((clvPoints.reduce((a, b) => a + b, 0) / clvPoints.length) * 10) / 10
        : null,
    clvJudgedLegs: clvPoints.length,
    unresolvedParlays: parlays.length - parlayOutcomes.length,
  }
}
