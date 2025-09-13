import { GeneratedParlay, NFLGame, NFLPlayer, ParlayLeg } from '../types'
import {
  PARLAY_STRATEGIES,
  StrategyConfig,
  VarietyFactors,
} from './parlayStrategies'

/**
 * Calculate parlay odds from individual American odds
 */
export const calculateParlayOdds = (individualOdds: string[]): string => {
  try {
    const decimalOdds = individualOdds.map(odds => {
      const num = parseInt(odds)
      return num > 0 ? num / 100 + 1 : 100 / Math.abs(num) + 1
    })

    const combinedDecimal = decimalOdds.reduce((acc, odds) => acc * odds, 1)
    return combinedDecimal >= 2
      ? `+${Math.round((combinedDecimal - 1) * 100)}`
      : `-${Math.round(100 / (combinedDecimal - 1))}`
  } catch {
    return '+550'
  }
}

/**
 * Validate that a player prop references a real player from current rosters
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
  const playerNames = allPlayers.map(p => p.displayName.toLowerCase())
  const legPlayerName = (leg.selection as string)?.toLowerCase() || ''

  return playerNames.some(
    name => name.includes(legPlayerName) || legPlayerName.includes(name)
  )
}

/**
 * Create strategy-appropriate alternative leg when validation fails
 */
export const createStrategyAlternative = (
  legIndex: number,
  game: NFLGame,
  strategy: StrategyConfig,
  varietyFactors: VarietyFactors
): ParlayLeg => {
  const alternatives = [
    {
      id: `alt-${legIndex + 1}`,
      betType: 'spread' as const,
      selection:
        Math.random() > 0.5
          ? game.homeTeam.displayName
          : game.awayTeam.displayName,
      target: `${Math.random() > 0.5 ? game.homeTeam.displayName : game.awayTeam.displayName} ${Math.random() > 0.5 ? '-' : '+'}${(Math.random() * 6 + 1).toFixed(1)}`,
      reasoning: `${strategy.name} selection based on ${varietyFactors.focusArea} analysis`,
      confidence: strategy.confidenceRange[0],
      odds: '-110',
    },
    {
      id: `alt-${legIndex + 1}`,
      betType: 'total' as const,
      selection: Math.random() > 0.5 ? 'Over' : 'Under',
      target: `${Math.random() > 0.5 ? 'Over' : 'Under'} ${(Math.random() * 10 + 42).toFixed(1)} Total Points`,
      reasoning: `${varietyFactors.gameScript} game script supports this total`,
      confidence: strategy.confidenceRange[1],
      odds: '-105',
    },
    {
      id: `alt-${legIndex + 1}`,
      betType: 'moneyline' as const,
      selection:
        Math.random() > 0.6
          ? game.homeTeam.displayName
          : game.awayTeam.displayName,
      target: `${Math.random() > 0.6 ? game.homeTeam.displayName : game.awayTeam.displayName} Moneyline`,
      reasoning: `${strategy.name} value play based on situational factors`,
      confidence: Math.floor(
        (strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2
      ),
      odds: Math.random() > 0.5 ? '+110' : '-120',
    },
  ]

  return alternatives[legIndex % alternatives.length]
}

/**
 * Create fallback parlay when AI generation fails
 */
export const createFallbackParlay = (
  game: NFLGame,
  varietyFactors?: VarietyFactors
): GeneratedParlay => {
  const strategy = varietyFactors
    ? PARLAY_STRATEGIES[varietyFactors.strategy]
    : PARLAY_STRATEGIES.conservative
  const isHomeFavorite = Math.random() > 0.4
  const spread = (Math.random() * 6 + 1).toFixed(1)
  const total = (Math.random() * 10 + 42).toFixed(1)

  return {
    id: `fallback-${Date.now()}`,
    legs: [
      {
        id: 'fallback-1',
        betType: 'spread',
        selection: isHomeFavorite
          ? game.homeTeam.displayName
          : game.awayTeam.displayName,
        target: `${isHomeFavorite ? game.homeTeam.displayName : game.awayTeam.displayName} ${isHomeFavorite ? '-' : '+'}${spread}`,
        reasoning: `${strategy.name} approach: ${isHomeFavorite ? 'Home field advantage' : 'Road team value'} analysis.`,
        confidence: strategy.confidenceRange[0],
        odds: '-110',
      },
      {
        id: 'fallback-2',
        betType: 'total',
        selection: Math.random() > 0.5 ? 'Over' : 'Under',
        target: `${Math.random() > 0.5 ? 'Over' : 'Under'} ${total} Total Points`,
        reasoning: `${strategy.name} total based on expected game flow and pace factors.`,
        confidence: strategy.confidenceRange[1],
        odds: '-105',
      },
      {
        id: 'fallback-3',
        betType: 'player_prop',
        selection: 'Starting QB',
        target: 'Starting QB Over 250.5 Passing Yards',
        reasoning: `${strategy.name} quarterback prop based on matchup analysis.`,
        confidence: Math.floor(
          (strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2
        ),
        odds: '-115',
      },
    ],
    gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - ${strategy.name}`,
    aiReasoning: `${strategy.name} fallback parlay: ${strategy.description}`,
    overallConfidence: Math.floor(
      (strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2
    ),
    estimatedOdds: '+525',
    createdAt: new Date().toISOString(),
  }
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

    // Validate and process legs
    const validatedLegs = parsed.legs
      .filter((leg: unknown) =>
        validatePlayerProp(
          leg as Record<string, unknown>,
          homeRoster,
          awayRoster
        )
      )
      .slice(0, 3)

    // Fill missing legs with alternatives
    while (validatedLegs.length < 3) {
      validatedLegs.push(
        createStrategyAlternative(
          validatedLegs.length,
          game,
          strategy,
          varietyFactors
        )
      )
    }

    const finalLegs: ParlayLeg[] = validatedLegs.map(
      (leg: any, index: number) => ({
        id: leg.id || `leg-${index + 1}`,
        betType: leg.betType || 'spread',
        selection: leg.selection || '',
        target: leg.target || '',
        reasoning: leg.reasoning || 'Strategic selection based on analysis',
        confidence: Math.min(Math.max(leg.confidence || 5, 1), 10),
        odds: leg.odds || '-110',
      })
    )

    return {
      id: `parlay-${Date.now()}`,
      legs: finalLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - ${strategy.name}`,
      aiReasoning:
        parsed.aiReasoning ||
        `${strategy.name} approach: ${strategy.description}`,
      overallConfidence: Math.min(
        Math.max(parsed.overallConfidence || 6, 1),
        10
      ),
      estimatedOdds: calculateParlayOdds(finalLegs.map(leg => leg.odds)),
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    return createFallbackParlay(game, varietyFactors)
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
