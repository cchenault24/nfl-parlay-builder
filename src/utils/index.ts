import { BetType, ParlayLeg } from '../types'

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
 * Format player prop target with team name
 */
export const formatPlayerProp = (leg: ParlayLeg): string => {
  if (leg.betType === 'player_prop') {
    // If the target already has the correct format, use it
    if (leg.target.includes('(') && leg.target.includes(')')) {
      return leg.target
    }

    // Otherwise, try to format it properly
    const playerName = leg.selection
    const target = leg.target

    // Try to extract the bet details
    const overUnderMatch = target.match(/(Over|Under)\s+([\d.]+)\s+(.+)/)

    if (overUnderMatch && playerName && playerName !== target) {
      const [, overUnder, value, statType] = overUnderMatch
      return `${playerName} - ${overUnder} ${value} ${statType}`
    }
  }

  return leg.target
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
 * Format game date for display
 */
export const formatGameDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Check if two teams are rivals
 */
export const isRivalryGame = (team1: string, team2: string): boolean => {
  const rivalries = [
    // --- NFC East ---
    ['Cowboys', 'Eagles'],
    ['Cowboys', 'Giants'],
    ['Cowboys', 'Commanders'],
    ['Eagles', 'Giants'],

    // --- NFC North ---
    ['Packers', 'Bears'],
    ['Packers', 'Vikings'],
    ['Bears', 'Vikings'],

    // --- NFC South ---
    ['Saints', 'Falcons'],
    ['Panthers', 'Falcons'],

    // --- NFC West ---
    ['49ers', 'Seahawks'],
    ['49ers', 'Rams'],
    ['49ers', 'Cowboys'], // Historic/Playoff Rivalry

    // --- AFC East ---
    ['Patriots', 'Jets'],
    ['Bills', 'Dolphins'],
    ['Bills', 'Patriots'],
    ['Colts', 'Patriots'], // Historic Rivalry

    // --- AFC North ---
    ['Ravens', 'Steelers'],
    ['Steelers', 'Bengals'],
    ['Steelers', 'Browns'],

    // --- AFC South ---
    ['Colts', 'Titans'],
    ['Texans', 'Titans'],

    // --- AFC West ---
    ['Chiefs', 'Raiders'],
    ['Chiefs', 'Broncos'],
    ['Chiefs', 'Bills'], // Modern Playoff Rivalry
    ['Raiders', 'Broncos'],
  ]

  return rivalries.some(
    rivalry => rivalry.includes(team1) && rivalry.includes(team2)
  )
}

/**
 * Sleep function for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
