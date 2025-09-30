import { BetType } from '../types'

// Workaround for TypeScript env issue
/**
 * Utility to get environment variables
 *
 * @param name Environment variable name
 * @returns Value or empty string if not found
 */
export const getEnvVar = (name: string): string => {
  return import.meta.env[name] || ''
}

/**
 * Get the color for a bet type (for MUI components)
 */
export const getBetTypeColor = (
  betType: BetType
): 'primary' | 'secondary' | 'success' | 'info' => {
  switch (betType) {
    case 'spread':
      return 'primary'
    case 'total':
      return 'secondary'
    case 'moneyline':
      return 'success'
    case 'player_receptions':
    case 'player_receiving_yards':
    case 'player_receiving_tds':
    case 'player_longest_reception':
    case 'player_rushing_yards':
    case 'player_rushing_attempts':
    case 'player_rushing_tds':
    case 'player_longest_rush':
    case 'player_passing_yards':
    case 'player_passing_attempts':
    case 'player_passing_completions':
    case 'player_passing_tds':
    case 'player_interceptions':
    case 'player_longest_completion':
    case 'player_anytime_td':
    case 'player_first_td':
    case 'player_last_td':
      return 'info'
    default:
      return 'primary'
  }
}

/**
 * Get confidence color based on score
 */
export const getConfidenceColor = (
  confidence: number
): 'success' | 'warning' | 'error' => {
  if (confidence >= 8) {
    return 'success'
  }
  if (confidence >= 6) {
    return 'warning'
  }
  return 'error'
}
