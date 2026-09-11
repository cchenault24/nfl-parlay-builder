import type { BetType } from './types'

// Semantic colour names (MUI's vocabulary on web) rather than hex, so each
// client resolves them against its own palette — see the mobile app's
// `semanticColor` map.
// The enum value as a label: `player_passing_yards` reads "Player passing
// yards". Sentence case, to sit beside the other chips ("Estimate", "Won").
export const betTypeLabel = (betType: string): string => {
  const words = betType.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export const getBetTypeColor = (
  betType: BetType
): 'primary' | 'secondary' | 'success' | 'info' => {
  if (betType === 'spread' || betType === 'first_half_spread') {
    return 'primary'
  }
  if (
    betType === 'total' ||
    betType === 'first_half_total' ||
    betType === 'team_total_points'
  ) {
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
