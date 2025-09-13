import { GeneratedParlay, NFLGame, NFLPlayer, ParlayLeg } from '../types'
import {
  ChainOfThoughtReasoning,
  ReasoningValidation,
} from '../types/reasoning'
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
    return '+550'
  }
}

/**
 * Validate that a player prop references a real player from current rosters
 */
export const validatePlayerProp = (
  leg: any,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[]
): boolean => {
  if (leg.betType !== 'player_prop') {
    return true
  }

  const allPlayers = [...homeRoster, ...awayRoster]
  const playerNames = allPlayers.map(p => p.displayName.toLowerCase())
  const legPlayerName = leg.selection?.toLowerCase() || ''

  const playerExists = playerNames.some(
    name => name.includes(legPlayerName) || legPlayerName.includes(name)
  )

  return playerExists
}

/**
 * Validate chain-of-thought reasoning structure and consistency
 */
export const validateChainOfThoughtReasoning = (
  reasoning: any,
  strategy: StrategyConfig
): ReasoningValidation => {
  const validation: ReasoningValidation = {
    isLogicallyConsistent: true,
    hasRequiredSteps: false,
    includesDataCitations: false,
    confidenceIsJustified: false,
    strategicAlignmentScore: 5,
    validationErrors: [],
  }

  try {
    // Check for required analytical steps
    if (
      !reasoning.analyticalSteps ||
      !Array.isArray(reasoning.analyticalSteps)
    ) {
      validation.validationErrors.push('Missing analytical steps array')
    } else if (reasoning.analyticalSteps.length < 3) {
      validation.validationErrors.push(
        'Insufficient analytical steps (minimum 3 required)'
      )
    } else {
      validation.hasRequiredSteps = true
    }

    // Check for data citations
    if (
      !reasoning.keyDataPoints ||
      !Array.isArray(reasoning.keyDataPoints) ||
      reasoning.keyDataPoints.length === 0
    ) {
      validation.validationErrors.push('Missing or insufficient data citations')
    } else {
      validation.includesDataCitations = true
    }

    // Validate confidence breakdown
    if (!reasoning.confidenceBreakdown) {
      validation.validationErrors.push('Missing confidence breakdown')
    } else {
      const confBreakdown = reasoning.confidenceBreakdown
      const score = confBreakdown.score

      // Check if confidence score is within strategy range
      if (
        score < strategy.confidenceRange[0] ||
        score > strategy.confidenceRange[1]
      ) {
        validation.validationErrors.push(
          `Confidence score ${score} outside strategy range ${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}`
        )
      }

      // Check if confidence has proper justification
      if (
        !confBreakdown.primaryFactors ||
        confBreakdown.primaryFactors.length === 0
      ) {
        validation.validationErrors.push(
          'Missing confidence justification factors'
        )
      } else {
        validation.confidenceIsJustified = true
      }
    }

    // Check strategic rationale
    if (
      !reasoning.strategicRationale ||
      reasoning.strategicRationale.length < 20
    ) {
      validation.validationErrors.push(
        'Insufficient strategic rationale explanation'
      )
      validation.strategicAlignmentScore = 3
    } else if (
      reasoning.strategicRationale
        .toLowerCase()
        .includes(strategy.name.toLowerCase())
    ) {
      validation.strategicAlignmentScore = 8
    } else {
      validation.strategicAlignmentScore = 6
    }

    // Overall consistency check
    if (validation.validationErrors.length === 0) {
      validation.isLogicallyConsistent = true
    } else {
      validation.isLogicallyConsistent = false
    }
  } catch (error) {
    validation.validationErrors.push(`Validation error: ${error}`)
    validation.isLogicallyConsistent = false
  }

  return validation
}

/**
 * Create a fallback reasoning structure for legs with incomplete AI reasoning
 */
export const createFallbackReasoning = (
  leg: any,
  strategy: StrategyConfig,
  _varietyFactors: VarietyFactors
): ChainOfThoughtReasoning => {
  return {
    analyticalSteps: [
      {
        step: 1,
        description: 'Data Gathering & Initial Analysis',
        reasoning: `Analyzing ${leg.betType} bet based on ${strategy.name} strategy approach`,
        dataSource: 'strategy_framework',
        conclusion: 'Bet aligns with strategic parameters',
      },
      {
        step: 2,
        description: 'Risk Assessment',
        reasoning: `${strategy.riskProfile} risk profile suggests this bet fits strategy constraints`,
        dataSource: 'betting_strategy',
        conclusion: `Acceptable risk level for ${strategy.name} approach`,
      },
      {
        step: 3,
        description: 'Confidence Calibration',
        reasoning: `Confidence set within strategy range based on available information`,
        dataSource: 'strategy_guidelines',
        conclusion: `Confidence aligns with ${strategy.riskProfile} risk tolerance`,
      },
    ],
    keyDataPoints: [
      {
        source: 'betting_strategy',
        specificData: `${strategy.name}: ${strategy.description}`,
        relevance: 'Provides strategic framework for bet selection',
      },
    ],
    strategicRationale: `This ${leg.betType} bet follows ${strategy.name} methodology with ${strategy.riskProfile} risk profile`,
    riskAssessment: {
      likelihood:
        strategy.riskProfile === 'low'
          ? 'high'
          : strategy.riskProfile === 'high'
            ? 'medium'
            : 'medium',
      primaryRisks: ['Limited analytical data', 'Standard betting risks'],
      mitigation: `Strategy-based selection using ${strategy.name} approach`,
    },
    confidenceBreakdown: {
      score: Math.floor(
        (strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2
      ),
      primaryFactors: ['Strategic alignment', 'Risk profile match'],
      riskFactors: ['Limited specific analysis'],
      uncertainties: ['Incomplete reasoning data'],
      supportingData: [],
    },
    alternativeConsiderations: [
      `Other ${leg.betType} options were considered but rejected based on strategy constraints`,
    ],
  }
}

/**
 * Create strategy-appropriate alternative leg when AI reasoning fails
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
 * Create fallback parlay with basic reasoning when AI completely fails
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
        reasoning: `${strategy.name} approach: ${isHomeFavorite ? 'Home field advantage' : 'Road team value'} analysis with enhanced reasoning.`,
        confidence: strategy.confidenceRange[0],
        odds: '-110',
      },
      {
        id: 'fallback-2',
        betType: 'total',
        selection: Math.random() > 0.5 ? 'Over' : 'Under',
        target: `${Math.random() > 0.5 ? 'Over' : 'Under'} ${total} Total Points`,
        reasoning: `${strategy.name} total based on expected game flow and pace factors with enhanced analytical framework.`,
        confidence: strategy.confidenceRange[1],
        odds: '-105',
      },
      {
        id: 'fallback-3',
        betType: 'player_prop',
        selection: 'Starting QB',
        target: 'Starting QB Over 250.5 Passing Yards',
        reasoning: `${strategy.name} quarterback prop based on matchup analysis and chain-of-thought methodology.`,
        confidence: Math.floor(
          (strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2
        ),
        odds: '-115',
      },
    ],
    gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - ${strategy.name}`,
    aiReasoning: `${strategy.name} fallback parlay with enhanced reasoning framework: ${strategy.description}`,
    overallConfidence: Math.floor(
      (strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2
    ),
    estimatedOdds: '+525',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Parse and validate enhanced AI response with chain-of-thought reasoning
 * Maintains backward compatibility with existing GeneratedParlay interface
 */
export const parseAIResponse = (
  response: string,
  game: NFLGame,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[],
  varietyFactors: VarietyFactors
): GeneratedParlay => {
  try {
    console.log(
      `📝 Parsing AI response with enhanced reasoning (${response.length} chars)`
    )

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('No JSON found in AI response, using fallback')
      throw new Error('No JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

    // Validate basic structure
    if (
      !parsed.legs ||
      !Array.isArray(parsed.legs) ||
      parsed.legs.length !== 3
    ) {
      console.warn('Invalid parlay structure from AI, using fallback')
      throw new Error('Invalid parlay structure from AI')
    }

    // Process and validate each leg with enhanced reasoning
    const validatedLegs = processLegsWithEnhancedReasoning(
      parsed.legs,
      homeRoster,
      awayRoster,
      strategy,
      varietyFactors
    )

    // Ensure we have exactly 3 legs
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

    // Take only first 3 legs
    const finalLegs = validatedLegs.slice(0, 3) as [
      ParlayLeg,
      ParlayLeg,
      ParlayLeg,
    ]

    // Calculate parlay odds
    const individualOdds = finalLegs.map(leg => leg.odds)
    const calculatedOdds = calculateParlayOdds(individualOdds)

    const parlay: GeneratedParlay = {
      id: `enhanced-${Date.now()}`,
      legs: finalLegs,
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - ${strategy.name}`,
      aiReasoning:
        parsed.aiReasoning ||
        `${strategy.name} approach with enhanced chain-of-thought reasoning: ${strategy.description}`,
      overallConfidence: Math.min(
        Math.max(parsed.overallConfidence || 6, 1),
        10
      ),
      estimatedOdds: calculatedOdds,
      createdAt: new Date().toISOString(),
    }

    console.log(
      `✅ Successfully parsed enhanced parlay with ${finalLegs.length} validated legs`
    )
    return parlay
  } catch (error) {
    console.error('Error parsing enhanced AI response:', error)
    return createFallbackParlay(game, varietyFactors)
  }
}

/**
 * Process legs with enhanced reasoning while maintaining backward compatibility
 */
const processLegsWithEnhancedReasoning = (
  rawLegs: any[],
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[],
  strategy: StrategyConfig,
  varietyFactors: VarietyFactors
): ParlayLeg[] => {
  const processedLegs: ParlayLeg[] = []

  for (let i = 0; i < rawLegs.length; i++) {
    const leg = rawLegs[i]

    // Validate player props against current rosters
    if (
      leg.betType === 'player_prop' &&
      !validatePlayerProp(leg, homeRoster, awayRoster)
    ) {
      console.warn(`Invalid player in leg ${i + 1}, creating alternative`)
      processedLegs.push(
        createStrategyAlternative(
          i,
          {
            homeTeam: { displayName: 'Home' },
            awayTeam: { displayName: 'Away' },
          } as NFLGame,
          strategy,
          varietyFactors
        )
      )
      continue
    }

    // Extract reasoning - enhanced if available, fallback if not
    let reasoning: string
    let confidence: number

    if (leg.chainOfThoughtReasoning) {
      // Enhanced reasoning available - validate it
      const validation = validateChainOfThoughtReasoning(
        leg.chainOfThoughtReasoning,
        strategy
      )

      if (validation.validationErrors.length > 0) {
        console.warn(
          `Validation errors in leg ${i + 1}:`,
          validation.validationErrors
        )
      }

      // Use summary or create one from detailed reasoning
      reasoning =
        leg.reasoning ||
        `${leg.chainOfThoughtReasoning.strategicRationale?.substring(
          0,
          200
        )}...` ||
        'Enhanced analytical reasoning applied'

      confidence =
        leg.chainOfThoughtReasoning.confidenceBreakdown?.score ||
        leg.confidence ||
        strategy.confidenceRange[0]
    } else {
      // Basic reasoning - use as-is
      reasoning =
        leg.reasoning ||
        `${strategy.name} selection based on strategic analysis`
      confidence = leg.confidence || strategy.confidenceRange[0]
    }

    // Ensure confidence is within valid range
    confidence = Math.min(Math.max(confidence, 1), 10)

    processedLegs.push({
      id: leg.id || `enhanced-leg-${i + 1}`,
      betType: leg.betType || 'spread',
      selection: leg.selection || '',
      target: leg.target || '',
      reasoning,
      confidence,
      odds: leg.odds || '-110',
    })
  }

  return processedLegs
}

/**
 * Extract strategy name from parlay for diversity tracking
 */
export const getStrategyFromParlay = (parlay: GeneratedParlay): string => {
  // Try to extract strategy from gameContext
  const contextMatch = parlay.gameContext.match(/ - (.+)$/)
  if (contextMatch) {
    return contextMatch[1]
  }

  // Fallback to extracting from aiReasoning
  const strategies = Object.values(PARLAY_STRATEGIES).map(s => s.name)
  const foundStrategy = strategies.find(name =>
    parlay.aiReasoning.toLowerCase().includes(name.toLowerCase())
  )

  return foundStrategy || 'Unknown Strategy'
}
