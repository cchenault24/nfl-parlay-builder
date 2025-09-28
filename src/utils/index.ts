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

// Export store utilities
export * from './store'

// Export error handling utilities
export * from './errorHandling'

// Export logging utilities
export * from './logger'

// Export utility functions for debugging
export { clearAllStoreData, clearStoreFromStorage } from './store'

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
    case 'player_prop':
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

/**
 * Calculate parlay odds from individual odds
 */
export const calculateParlayOdds = (individualOdds: string[]): string => {
  try {
    // Convert odds to decimal, multiply, convert back to American
    const decimalOdds = individualOdds.map(odds => {
      const num = parseInt(odds)
      if (num > 0) {
        return num / 100 + 1
      }
      return 100 / Math.abs(num) + 1
    })

    const combinedDecimal = decimalOdds.reduce((acc, odds) => acc * odds, 1)
    const americanOdds =
      combinedDecimal >= 2
        ? `+${Math.round((combinedDecimal - 1) * 100)}`
        : `-${Math.round(100 / (combinedDecimal - 1))}`

    return americanOdds
  } catch {
    return '+550' // Reasonable fallback
  }
}

/**
 * Format game date and time for display
 */
export const formatGameDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
