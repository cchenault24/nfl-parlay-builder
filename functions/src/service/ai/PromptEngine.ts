import { GameRosters, NFLGame, NFLPlayer, VarietyFactors } from '../../types'
import { GameContext, ParlayGenerationContext } from './BaseParlayProvider'

/**
 * Enhanced bet type system for more diverse selections
 */
export interface EnhancedBetType {
  id: string
  category: 'team' | 'player' | 'game' | 'special'
  name: string
  description: string
  contextFactors: string[]
  exampleFormats: string[]
}

export const ENHANCED_BET_TYPES: Record<string, EnhancedBetType> = {
  // Team-focused bets
  spread: {
    id: 'spread',
    category: 'team',
    name: 'Point Spread',
    description: 'Team point spread with various lines',
    contextFactors: ['home_field', 'recent_form', 'matchup'],
    exampleFormats: [
      '{team} -3.5',
      '{team} +7.5',
      'Alternative spread {team} -6.5',
    ],
  },
  moneyline: {
    id: 'moneyline',
    category: 'team',
    name: 'Moneyline',
    description: 'Straight win/loss bet',
    contextFactors: ['underdog_value', 'rivalry', 'momentum'],
    exampleFormats: ['{team} ML', '{team} to win outright'],
  },
  team_total: {
    id: 'team_total',
    category: 'team',
    name: 'Team Total Points',
    description: 'Individual team scoring total',
    contextFactors: ['offensive_efficiency', 'opponent_defense', 'pace'],
    exampleFormats: ['{team} Over 24.5 points', '{team} Under 21.5 points'],
  },

  // Game-focused bets
  total: {
    id: 'total',
    category: 'game',
    name: 'Game Total',
    description: 'Combined points total for both teams',
    contextFactors: ['weather', 'pace', 'defensive_matchup'],
    exampleFormats: ['Over 47.5 total points', 'Under 44.5 total points'],
  },
  first_half_total: {
    id: 'first_half_total',
    category: 'game',
    name: 'First Half Total',
    description: 'Points scored in first half only',
    contextFactors: ['fast_starts', 'scripted_plays', 'weather'],
    exampleFormats: ['1H Over 24.5 points', '1H Under 21.5 points'],
  },

  // Player performance bets
  player_passing: {
    id: 'player_passing',
    category: 'player',
    name: 'Passing Props',
    description: 'Quarterback passing statistics',
    contextFactors: ['opponent_pass_defense', 'weather', 'game_script'],
    exampleFormats: [
      '{player} Over 275.5 passing yards',
      '{player} Over 1.5 passing TDs',
      '{player} Over 24.5 completions',
      '{player} Under 0.5 interceptions',
    ],
  },
  player_rushing: {
    id: 'player_rushing',
    category: 'player',
    name: 'Rushing Props',
    description: 'Rushing statistics for any position',
    contextFactors: ['opponent_run_defense', 'game_script', 'workload'],
    exampleFormats: [
      '{player} Over 85.5 rushing yards',
      '{player} Over 0.5 rushing TDs',
      '{player} Over 18.5 rushing attempts',
      '{player} Longest rush Over 15.5 yards',
    ],
  },
  player_receiving: {
    id: 'player_receiving',
    category: 'player',
    name: 'Receiving Props',
    description: 'Receiving statistics for skill position players',
    contextFactors: ['target_share', 'matchup', 'game_script'],
    exampleFormats: [
      '{player} Over 65.5 receiving yards',
      '{player} Over 5.5 receptions',
      '{player} Over 0.5 receiving TDs',
      '{player} Over 8.5 targets',
    ],
  },

  // Special/situational bets
  first_touchdown: {
    id: 'first_touchdown',
    category: 'special',
    name: 'First Touchdown',
    description: 'Player to score first touchdown',
    contextFactors: ['red_zone_usage', 'goal_line_carries', 'target_share'],
    exampleFormats: ['{player} first TD scorer', '{player} anytime TD'],
  },
  defensive_props: {
    id: 'defensive_props',
    category: 'special',
    name: 'Defensive Props',
    description: 'Team or individual defensive statistics',
    contextFactors: ['opponent_turnovers', 'pass_rush', 'coverage'],
    exampleFormats: [
      '{team} Over 1.5 sacks',
      '{team} Over 0.5 interceptions',
      '{team} defensive TD',
    ],
  },
}

/**
 * Provider-agnostic prompt engine for generating AI prompts
 * Includes sophisticated anti-template logic
 */
export class PromptEngine {
  /**
   * Create system prompt with anti-template instructions
   */
  static createSystemPrompt(context: ParlayGenerationContext): string {
    const { strategy, antiTemplateHints } = context

    return `You are an expert NFL betting analyst creating authentic, game-specific parlay recommendations.

STRATEGY: ${strategy.name}
APPROACH: ${strategy.description || 'Comprehensive football analysis with strategic bet selection'}
CONFIDENCE TARGET: ${this.getConfidenceRange(strategy.riskLevel)}/10
RISK TOLERANCE: ${strategy.riskLevel || 'medium'}

🚫 CRITICAL: AVOID FORMULAIC TEMPLATES
- DO NOT follow rigid patterns like "Team spread + QB rushing + Game total"
- Each leg must be chosen based on THIS specific game's unique characteristics
- Avoid generic reasoning that could apply to any game
- Your analysis must reflect actual football knowledge, not betting templates

✅ REQUIREMENTS:
1. Generate EXACTLY 3 legs with DIFFERENT bet categories when possible
2. Use ONLY players from the provided rosters
3. Each selection must have specific football reasoning tied to this matchup
4. Confidence scores must reflect genuine assessment, not arbitrary numbers
5. Include comprehensive game analysis in gameSummary

AVAILABLE BET TYPES:
${this.formatBetTypesForPrompt()}

GAME-SPECIFIC CONTEXT TO ADDRESS:
${antiTemplateHints.emphasizeUnique.length > 0 ? antiTemplateHints.emphasizeUnique.map(hint => `• ${hint}`).join('\n') : '• Analyze this specific matchup thoroughly'}

ANTI-TEMPLATE CHECKLIST:
- ❌ Using the same bet type sequence as typical templates
- ❌ Generic phrases like "home field advantage" without specifics  
- ❌ Ignoring obvious game context (weather, injuries, rest)
- ❌ Cookie-cutter confidence scores (all 7s or 8s)
- ✅ Genuine game analysis with specific player/team factors
- ✅ Bet types that make sense for THIS particular game situation
- ✅ Reasoning that couldn't be copy-pasted to another game

${antiTemplateHints.avoidPatterns.length > 0 ? `\nAVOID these overused phrases: ${antiTemplateHints.avoidPatterns.join(', ')}` : ''}

${antiTemplateHints.contextualFactors.length > 0 ? `\nMUST ADDRESS these factors: ${antiTemplateHints.contextualFactors.join(', ')}` : ''}

Focus on authentic football analysis that drives confident bet selections.`
  }

  /**
   * Create game-specific user prompt with context emphasis
   */
  static createUserPrompt(
    game: NFLGame,
    rosters: GameRosters,
    context: ParlayGenerationContext
  ): string {
    const { varietyFactors, gameContext } = context

    return `${this.formatGameHeader(game)}

${this.formatGameContext(gameContext)}

${this.formatRosterInformation(game, rosters)}

${this.formatVarietyGuidance(varietyFactors)}

${this.formatOutputInstructions(game)}

REMEMBER: This is ${game.awayTeam.displayName} @ ${game.homeTeam.displayName} in Week ${game.week}.
Your analysis and bet selections must be specific to THIS matchup, not generic templates.`
  }

  // === Private Helper Methods ===

  /**
   * Get confidence range based on risk level
   */
  private static getConfidenceRange(riskLevel?: string): string {
    switch (riskLevel) {
      case 'conservative':
        return '7-9'
      case 'aggressive':
        return '4-7'
      default:
        return '5-8'
    }
  }

  /**
   * Format bet types for prompt display
   */
  private static formatBetTypesForPrompt(): string {
    const categories = ['team', 'game', 'player', 'special'] as const

    return categories
      .map(category => {
        const types = Object.values(ENHANCED_BET_TYPES).filter(
          bt => bt.category === category
        )
        const typeList = types
          .map(bt => `  • ${bt.name}: ${bt.description}`)
          .join('\n')
        return `${category.toUpperCase()} BETS:\n${typeList}`
      })
      .join('\n\n')
  }

  /**
   * Format game header with essential info
   */
  private static formatGameHeader(game: NFLGame): string {
    const startTime = game.startTime
      ? new Date(game.startTime).toLocaleString()
      : 'TBD'
    return `GAME ANALYSIS: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Week ${game.week} | ${startTime}${game.venue ? ` | ${game.venue}` : ''}`
  }

  /**
   * Format game context with relevant factors
   */
  private static formatGameContext(gameContext: GameContext): string {
    const contextLines: string[] = []

    // Weather conditions
    if (
      gameContext.weather &&
      gameContext.weather?.condition !== 'clear' &&
      gameContext.weather?.condition !== 'indoor'
    ) {
      const temp = gameContext.weather.temperature
        ? ` (${gameContext.weather.temperature}°F)`
        : ''
      const wind = gameContext.weather.windSpeed
        ? `, Wind: ${gameContext.weather.windSpeed}mph`
        : ''
      contextLines.push(
        `Weather: ${gameContext.weather.condition}${temp}${wind}`
      )
    }

    // Game significance
    if (gameContext.isRivalry) {
      contextLines.push('Context: Divisional rivalry game')
    }

    if (gameContext.isPrimeTime) {
      contextLines.push('Spotlight: Prime time national game')
    }

    if (gameContext.isPlayoffs) {
      contextLines.push('Stakes: Playoff implications')
    }

    // Rest advantage/disadvantage
    const restDifference = Math.abs(
      gameContext.restDays.home - gameContext.restDays.away
    )
    if (restDifference > 2) {
      contextLines.push(
        `Rest: Home ${gameContext.restDays.home}d, Away ${gameContext.restDays.away}d`
      )
    }

    // Venue information
    if (gameContext.venue) {
      const venueInfo = `${gameContext.venue.type} (${gameContext.venue.surface})`
      if (gameContext.venue.homeFieldAdvantage > 7) {
        contextLines.push(`Venue: ${venueInfo} - Strong home field advantage`)
      } else {
        contextLines.push(`Venue: ${venueInfo}`)
      }
    }

    // Public betting if available
    if (gameContext.publicBetting) {
      contextLines.push(
        `Public: ${gameContext.publicBetting.spreadConsensus}% on favorite, ${gameContext.publicBetting.totalConsensus}% on over`
      )
    }

    // Injury information
    if (gameContext.injuries && gameContext.injuries.length > 0) {
      const keyInjuries = gameContext.injuries
        .filter(inj => inj.status === 'out' || inj.status === 'doubtful')
        .slice(0, 3)

      if (keyInjuries.length > 0) {
        const injuryList = keyInjuries
          .map(inj => `${inj.playerName} (${inj.position}) - ${inj.status}`)
          .join(', ')
        contextLines.push(`Key Injuries: ${injuryList}`)
      }
    }

    return contextLines.length > 0
      ? `GAME CONTEXT:\n${contextLines.map(line => `• ${line}`).join('\n')}\n`
      : ''
  }

  /**
   * Format roster information with key players
   */
  private static formatRosterInformation(
    game: NFLGame,
    rosters: GameRosters
  ): string {
    const formatPlayersByPosition = (
      players: NFLPlayer[],
      positions: string[],
      limit: number = 3
    ) => {
      return positions
        .map(pos => {
          const posPlayers = players
            .filter(p => {
              const position = p.position
              if (typeof position === 'string') {
                return position === pos
              }
              return position?.abbreviation === pos
            })
            .slice(0, limit)

          if (posPlayers.length === 0) return ''

          const playerNames = posPlayers
            .map(
              p =>
                `${p.displayName || p.fullName}${p.jersey ? ` (#${p.jersey})` : ''}`
            )
            .join(', ')
          return `${pos}: ${playerNames}`
        })
        .filter(Boolean)
        .join('\n')
    }

    // Fix: Use correct property names from shared types
    const homeRoster = rosters.home
      ? formatPlayersByPosition(rosters.home, ['QB', 'RB', 'WR', 'TE'], 3)
      : 'No roster data available'

    const awayRoster = rosters.away
      ? formatPlayersByPosition(rosters.away, ['QB', 'RB', 'WR', 'TE'], 3)
      : 'No roster data available'

    return `${game.homeTeam.displayName.toUpperCase()} KEY PLAYERS:
${homeRoster}

${game.awayTeam.displayName.toUpperCase()} KEY PLAYERS:
${awayRoster}`
  }

  /**
   * Format variety guidance for AI
   */
  private static formatVarietyGuidance(varietyFactors: VarietyFactors): string {
    const lines: string[] = []

    if (varietyFactors.strategy) {
      lines.push(`Strategy: ${varietyFactors.strategy}`)
    }

    if (varietyFactors.gameScript) {
      lines.push(`Expected Game Script: ${varietyFactors.gameScript}`)
    }

    if (varietyFactors.focusArea) {
      lines.push(`Focus Area: ${varietyFactors.focusArea}`)
    }

    if (varietyFactors.playerTier) {
      lines.push(`Player Tier: ${varietyFactors.playerTier}`)
    }

    if (varietyFactors.marketBias) {
      lines.push(`Market Bias: ${varietyFactors.marketBias}`)
    }

    if (varietyFactors.focusPlayer) {
      lines.push(`Focus Player: ${varietyFactors.focusPlayer}`)
    }

    if (varietyFactors.riskTolerance !== undefined) {
      lines.push(`Risk Tolerance: ${varietyFactors.riskTolerance}/10`)
    }

    return lines.length > 0
      ? `ANALYSIS FOCUS:\n${lines.map(line => `• ${line}`).join('\n')}`
      : 'ANALYSIS FOCUS:\n• Balanced approach with strategic bet selection'
  }

  /**
   * Format output instructions with required JSON structure
   */
  private static formatOutputInstructions(game: NFLGame): string {
    return `REQUIRED JSON OUTPUT FORMAT:
{
  "legs": [
    {
      "id": "1",
      "betType": "spread|total|moneyline|player_prop",
      "selection": "Specific bet description (e.g., 'Chiefs -3.5' or 'Patrick Mahomes Over 275.5 passing yards')",
      "target": "Exact line/target with units",
      "reasoning": "Football-specific analysis for THIS game explaining why this bet makes sense",
      "confidence": 1-10,
      "odds": "-110" // Realistic betting odds
    }
    // ... exactly 3 legs total
  ],
  "gameContext": "Brief description of this Week ${game.week} matchup",
  "aiReasoning": "Overall strategy connecting all three legs and why they work together",
  "overallConfidence": 1-10,
  "estimatedOdds": "+450", // Combined parlay odds
  "gameSummary": {
    "matchupAnalysis": "Detailed analysis of key offensive vs defensive matchups",
    "gameFlow": "high_scoring_shootout|defensive_grind|balanced_tempo|potential_blowout",
    "keyFactors": ["Factor 1", "Factor 2", "Factor 3"], // 3-5 key factors
    "prediction": "Specific prediction for how this game unfolds",
    "confidence": 1-10
  }
}

CRITICAL REQUIREMENTS:
- All player names must be from the provided rosters
- Each leg must have unique reasoning specific to this matchup
- Confidence scores should vary based on actual assessment
- Odds should be realistic for the bet type
- Game analysis must be specific to these teams/players`
  }

  /**
   * Create a validation prompt for generated parlays
   */
  static createValidationPrompt(generatedParlay: any): string {
    return `Please validate this generated parlay for accuracy and realism:

${JSON.stringify(generatedParlay, null, 2)}

Check for:
1. Are all player names realistic NFL players?
2. Are bet types and odds realistic?
3. Is the reasoning specific to the teams/players mentioned?
4. Do the confidence scores make sense?
5. Is the JSON structure correct?

Respond with either "VALID" or list specific issues that need fixing.`
  }

  /**
   * Create a refinement prompt for improving generated parlays
   */
  static createRefinementPrompt(originalParlay: any, feedback: string): string {
    return `Please refine this parlay based on the following feedback:

ORIGINAL PARLAY:
${JSON.stringify(originalParlay, null, 2)}

FEEDBACK TO ADDRESS:
${feedback}

Please generate an improved version that addresses these concerns while maintaining the same game context and overall strategy.`
  }
}
