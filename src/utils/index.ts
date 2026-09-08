import type { BetType } from '../types'

export * from './teamLogos'

export const getEnvVar = (name: string): string => import.meta.env[name] || ''

export const formatOdds = (odds: number): string =>
  odds > 0 ? `+${odds}` : String(odds)

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
