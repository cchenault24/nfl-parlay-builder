import { GameRosters, NFLGame, NFLPlayer } from '../../types'
import { ParlayGenerationContext } from './BaseParlayProvider'

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
    const { strategy, gameContext, antiTemplateHints } = context

    return `You are an expert NFL betting analyst creating authentic, game-specific parlay recommendations.

STRATEGY: ${strategy.name}
APPROACH: ${strategy.description}
CONFIDENCE TARGET: ${strategy.riskLevel === 'low' ? '7-9' : strategy.riskLevel === 'high' ? '4-7' : '5-8'}/10

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
${antiTemplateHints.length > 0 ? antiTemplateHints.map(hint => `• ${hint}`).join('\n') : '• Analyze this specific matchup thoroughly'}

ANTI-TEMPLATE CHECKLIST:
- ❌ Using the same bet type sequence as typical templates
- ❌ Generic phrases like "home field advantage" without specifics  
- ❌ Ignoring obvious game context (weather, injuries, rest)
- ❌ Cookie-cutter confidence scores (all 7s or 8s)
- ✅ Genuine game analysis with specific player/team factors
- ✅ Bet types that make sense for THIS particular game situation
- ✅ Reasoning that couldn't be copy-pasted to another game

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

  private static formatGameHeader(game: NFLGame): string {
    return `GAME ANALYSIS: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Week ${game.week} | ${game.date || 'Date TBD'}`
  }

  private static formatGameContext(gameContext: any): string {
    const contextLines: string[] = []

    if (gameContext.weather?.condition !== 'clear') {
      contextLines.push(`Weather: ${gameContext.weather.condition} conditions`)
    }

    if (gameContext.rivalry) {
      contextLines.push('Context: Divisional rivalry game')
    }

    if (gameContext.primeTime) {
      contextLines.push('Spotlight: Prime time national game')
    }

    if (gameContext.restDays !== 7) {
      contextLines.push(`Rest: ${gameContext.restDays} days between games`)
    }

    return contextLines.length > 0
      ? `GAME CONTEXT:\n${contextLines.map(line => `• ${line}`).join('\n')}\n`
      : ''
  }

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
            .filter(p => p.position.abbreviation === pos)
            .slice(0, limit)

          if (posPlayers.length === 0) return ''

          const playerNames = posPlayers
            .map(p => `${p.fullName} (#${p.jersey})`)
            .join(', ')
          return `${pos}: ${playerNames}`
        })
        .filter(Boolean)
        .join('\n')
    }

    const homeRoster = formatPlayersByPosition(
      rosters.homeRoster,
      ['QB', 'RB', 'WR', 'TE'],
      3
    )

    const awayRoster = formatPlayersByPosition(
      rosters.awayRoster,
      ['QB', 'RB', 'WR', 'TE'],
      3
    )

    return `${game.homeTeam.displayName.toUpperCase()} KEY PLAYERS:
${homeRoster}

${game.awayTeam.displayName.toUpperCase()} KEY PLAYERS:
${awayRoster}`
  }

  private static formatVarietyGuidance(varietyFactors: any): string {
    return `ANALYSIS FOCUS:
• Strategy: ${varietyFactors.strategy}
• Game Script: ${varietyFactors.gameScript}
• Focus Area: ${varietyFactors.focusArea || 'balanced'}`
  }

  private static formatOutputInstructions(game: NFLGame): string {
    return `REQUIRED JSON OUTPUT:
{
  "legs": [
    {
      "id": "1",
      "betType": "spread|total|moneyline|player_passing|player_rushing|player_receiving|team_total|first_touchdown|defensive_props",
      "selection": "Specific bet description",
      "target": "Exact line/target",
      "reasoning": "Football-specific analysis for THIS game",
      "confidence": 1-10,
      "odds": "-110"
    }
    // ... exactly 3 legs total
  ],
  "gameContext": "Week ${game.week} matchup description",
  "aiReasoning": "Overall strategy connecting the three legs",
  "overallConfidence": 1-10,
  "estimatedOdds": "+450",
  "gameSummary": {
    "matchupAnalysis": "Detailed analysis of offensive vs defensive matchups",
    "gameFlow": "high_scoring_shootout|defensive_grind|balanced_tempo|potential_blowout",
    "keyFactors": ["Factor 1", "Factor 2", "Factor 3"],
    "prediction": "Specific prediction for how this game unfolds",
    "confidence": 1-10
  }
}`
  }
}
