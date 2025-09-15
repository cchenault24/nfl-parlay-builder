import {
  GameSummary,
  GeneratedParlay,
  NFLGame,
  NFLPlayer,
  ParlayLeg,
} from '../types'
import { PARLAY_STRATEGIES, VarietyFactors } from './parlayStrategies'

/**
 * Calculate combined parlay odds from individual leg odds
 * Converts American odds to decimal, multiplies, then back to American
 */
export const calculateParlayOdds = (individualOdds: string[]): string => {
  try {
    const decimalOdds = individualOdds.map(americanToDecimal)
    const combinedDecimal = decimalOdds.reduce((acc, odds) => acc * odds, 1)
    return decimalToAmerican(combinedDecimal)
  } catch (error) {
    console.error('Error calculating parlay odds:', error)
    return '+500' // Fallback odds
  }
}

/**
 * Convert American odds to decimal odds
 */
const americanToDecimal = (americanOdds: string): number => {
  const odds = parseInt(americanOdds.replace(/[+-]/, ''))
  if (americanOdds.startsWith('-')) {
    return 1 + 100 / odds
  }
  return 1 + odds / 100
}

/**
 * Convert decimal odds to American odds
 */
const decimalToAmerican = (decimalOdds: number): string => {
  if (decimalOdds >= 2) {
    return `+${Math.round((decimalOdds - 1) * 100)}`
  }
  return `-${Math.round(100 / (decimalOdds - 1))}`
}

/**
 * Validate player prop against roster
 */
export const validatePlayerProp = (
  leg: Record<string, unknown>,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[]
): boolean => {
  if (leg.betType !== 'player_prop') {
    return true
  }

  const allPlayers = [...homeRoster, ...awayRoster]
  const playerName = leg.selection as string

  return allPlayers.some(
    player =>
      player.displayName.toLowerCase().includes(playerName.toLowerCase()) ||
      player.name.toLowerCase().includes(playerName.toLowerCase())
  )
}

/**
 * Parse and validate AI response with enhanced error handling
 */
export const parseAIResponse = (
  response: string,
  game: NFLGame,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[],
  varietyFactors: VarietyFactors
): GeneratedParlay => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    let jsonStr = jsonMatch[0].trim()

    // Clean common JSON formatting issues
    jsonStr = jsonStr
      .replace(/\r?\n|\r/g, ' ') // Replace newlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']')
      .replace(/[\u201C\u201D]/g, '"') // Smart quotes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/`/g, '"') // Backticks
      .replace(/\*\*"([^"]+)"\*\*/g, '"$1"') // Bold formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]/g, '"$1"') // Bracket notation
      .replace(/""\s*([^"]+)\s*""/g, '"$1"') // Double quotes

    const parsed = JSON.parse(jsonStr)
    const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

    if (
      !parsed.legs ||
      !Array.isArray(parsed.legs) ||
      parsed.legs.length !== 3
    ) {
      throw new Error('Invalid parlay structure from AI')
    }

    // Validate legs - if any fail validation, throw error
    const validatedLegs = parsed.legs.filter((leg: unknown) =>
      validatePlayerProp(leg as Record<string, unknown>, homeRoster, awayRoster)
    )

    if (validatedLegs.length < 3) {
      throw new Error(`Only ${validatedLegs.length} valid legs found, need 3`)
    }

    const finalLegs: ParlayLeg[] = validatedLegs
      .slice(0, 3)
      .map((leg: any, index: number) => ({
        id: leg.id || `leg-${index + 1}`,
        betType: leg.betType || 'spread',
        selection: leg.selection || '',
        target: leg.target || '',
        reasoning: leg.reasoning || 'Strategic selection based on analysis',
        confidence: Math.min(Math.max(leg.confidence || 5, 1), 10),
        odds: leg.odds || '-110',
      }))

    const gameSummary: GameSummary | undefined = parsed.gameSummary
      ? {
          matchupAnalysis:
            typeof parsed.gameSummary.matchupAnalysis === 'string'
              ? parsed.gameSummary.matchupAnalysis
              : typeof parsed.gameSummary.matchupAnalysis === 'object'
                ? Object.values(parsed.gameSummary.matchupAnalysis || {}).join(
                    ' '
                  ) ||
                  `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} matchup analysis.`
                : `${game.awayTeam.displayName} vs ${game.homeTeam.displayName} matchup analysis.`,
          gameFlow: [
            'high_scoring_shootout',
            'defensive_grind',
            'balanced_tempo',
            'potential_blowout',
          ].includes(parsed.gameSummary.gameFlow)
            ? parsed.gameSummary.gameFlow
            : 'balanced_tempo',
          keyFactors: Array.isArray(parsed.gameSummary.keyFactors)
            ? parsed.gameSummary.keyFactors.map((f: string) => f).slice(0, 5)
            : typeof parsed.gameSummary.keyFactors === 'object'
              ? Object.values(parsed.gameSummary.keyFactors || {})
                  .map(f => String(f))
                  .slice(0, 5)
              : ['Team matchups', 'Key player availability', 'Game conditions'],
          prediction:
            typeof parsed.gameSummary.prediction === 'string'
              ? parsed.gameSummary.prediction
              : typeof parsed.gameSummary.prediction === 'object'
                ? Object.values(parsed.gameSummary.prediction || {}).join(
                    ' '
                  ) || 'Competitive game expected between these two teams.'
                : 'Competitive game expected between these two teams.',
          confidence: Math.min(
            Math.max(Number(parsed.gameSummary.confidence) || 6, 1),
            10
          ),
        }
      : undefined

    return {
      id: `parlay-${Date.now()}`,
      legs: finalLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
      aiReasoning:
        parsed.aiReasoning ||
        `${strategy.name} approach: ${strategy.description}`,
      overallConfidence: Math.min(
        Math.max(parsed.overallConfidence || 6, 1),
        10
      ),
      estimatedOdds: calculateParlayOdds(finalLegs.map(leg => leg.odds)),
      createdAt: new Date().toISOString(),
      gameSummary,
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    // Re-throw error instead of creating fallback
    throw new Error(
      `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract strategy name from parlay for diversity tracking
 */
export const getStrategyFromParlay = (parlay: GeneratedParlay): string => {
  const contextMatch = parlay.gameContext.match(/ - (.+)$/)
  if (contextMatch) {
    return contextMatch[1]
  }

  const strategies = Object.values(PARLAY_STRATEGIES).map(s => s.name)
  const foundStrategy = strategies.find(name =>
    parlay.aiReasoning.toLowerCase().includes(name.toLowerCase())
  )

  return foundStrategy || 'Unknown Strategy'
}
