import type { BetType } from '../types'

export * from './teamLogos'

export const getEnvVar = (name: string): string => import.meta.env[name] || ''

export const formatOdds = (odds: number): string =>
  odds > 0 ? `+${odds}` : String(odds)

// The break-even win rate a price implies — e.g. -150 implies 60%. A leg
// whose stated confidence doesn't clear this isn't +EV even if it hits more
// often than not.
export const impliedProbability = (americanOdds: number): number =>
  americanOdds > 0
    ? 100 / (americanOdds + 100)
    : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)

export const getBetTypeColor = (
  betType: BetType
): 'primary' | 'secondary' | 'success' | 'info' => {
  if (betType === 'spread' || betType === 'first_half_spread') {
    return 'primary'
  }
  if (betType === 'total' || betType === 'first_half_total' || betType === 'team_total_points') {
    return 'secondary'
  }
  if (betType === 'moneyline') {
    return 'success'
  }
  return 'info'
}

export const getConfidenceColor = (
  confidence: number
): 'success' | 'warning' | 'error' => {
  if (confidence >= 0.65) {
    return 'success'
  }
  if (confidence >= 0.5) {
    return 'warning'
  }
  return 'error'
}
