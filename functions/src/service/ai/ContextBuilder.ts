import {
  GameRosters,
  NFLGame,
  StrategyConfig,
  VarietyFactors,
} from '../../types'
import {
  AntiTemplateHints,
  GameContext,
  ParlayGenerationContext,
} from './BaseParlayProvider'

/**
 * Service responsible for building rich context for AI parlay generation
 * This helps prevent template responses by providing game-specific insights
 */
export class ContextBuilder {
  /**
   * Build comprehensive context for AI parlay generation
   */
  static buildGenerationContext(
    game: NFLGame,
    rosters: GameRosters,
    strategy: StrategyConfig,
    varietyFactors: VarietyFactors,
    options: { temperature?: number; maxRetries?: number } = {}
  ): ParlayGenerationContext {
    const gameContext = this.analyzeGameContext(game, rosters)
    const antiTemplateHints = this.generateAntiTemplateHints(
      game,
      rosters,
      gameContext
    )

    return {
      strategy,
      varietyFactors,
      gameContext,
      antiTemplateHints: antiTemplateHints.emphasizeGameSpecifics,
      temperature: options.temperature,
      maxRetries: options.maxRetries || 3,
    }
  }

  /**
   * Analyze game-specific context factors
   */
  private static analyzeGameContext(
    game: NFLGame,
    rosters: GameRosters
  ): GameContext {
    return {
      weather: this.inferWeatherConditions(game),
      injuries: this.analyzeInjuries(rosters),
      restDays: this.calculateRestDays(game),
      rivalry: this.detectRivalry(game),
      playoffs: this.isPlayoffGame(game),
      primeTime: this.isPrimeTimeGame(game),
      homeFieldAdvantage: this.calculateHomeFieldAdvantage(game),
      publicBettingTrend: this.inferPublicTrend(game),
    }
  }

  /**
   * Generate context-specific hints to prevent template responses
   */
  private static generateAntiTemplateHints(
    game: NFLGame,
    rosters: GameRosters,
    gameContext: GameContext
  ): AntiTemplateHints {
    const gameSpecifics = this.identifyGameSpecificFactors(
      game,
      rosters,
      gameContext
    )

    return {
      recentBetTypePatterns: [], // Will be populated by tracking service later
      avoidGenericPhrases: [
        'home team advantage',
        'recent form suggests',
        'both teams have',
        'expect a competitive game',
        'value in this bet',
      ],
      emphasizeGameSpecifics: gameSpecifics,
      requiredContextFactors: this.getRequiredContextFactors(gameContext),
    }
  }

  /**
   * Identify unique factors specific to this game
   */
  private static identifyGameSpecificFactors(
    game: NFLGame,
    rosters: GameRosters,
    gameContext: GameContext
  ): string[] {
    const factors: string[] = []

    // Weather-specific factors
    if (
      gameContext.weather?.condition !== 'indoor' &&
      gameContext.weather?.condition !== 'clear'
    ) {
      factors.push(
        `Weather impact: ${gameContext.weather.condition} conditions expected`
      )
    }

    // Rest advantage/disadvantage
    if (gameContext.restDays < 6) {
      factors.push(
        `Short rest situation: ${gameContext.restDays} days between games`
      )
    } else if (gameContext.restDays > 10) {
      factors.push(
        `Extended rest: ${gameContext.restDays} days since last game`
      )
    }

    // Division/rivalry context
    if (gameContext.rivalry) {
      factors.push('Divisional rivalry game with historical significance')
    }

    // Prime time spotlight
    if (gameContext.primeTime) {
      factors.push('Prime time game with national audience')
    }

    // Playoff implications
    if (gameContext.playoffs) {
      factors.push('Playoff implications affecting team motivation')
    }

    // Key player analysis
    const keyPlayerFactors = this.analyzeKeyPlayerSituations(rosters)
    factors.push(...keyPlayerFactors)

    // Matchup-specific factors
    const matchupFactors = this.analyzeMatchupSpecifics(game, rosters)
    factors.push(...matchupFactors)

    return factors
  }

  /**
   * Analyze key player situations that should influence bet selection
   */
  private static analyzeKeyPlayerSituations(rosters: GameRosters): string[] {
    const factors: string[] = []

    // Analyze QB situations
    const homeQBs = rosters.homeRoster.filter(
      p => p.position.abbreviation === 'QB'
    )
    const awayQBs = rosters.awayRoster.filter(
      p => p.position.abbreviation === 'QB'
    )

    // Check for backup QBs or QB controversies
    if (homeQBs.length > 1) {
      factors.push(`QB situation for home team: multiple QBs available`)
    }
    if (awayQBs.length > 1) {
      factors.push(`QB situation for away team: multiple QBs available`)
    }

    // Analyze skill position depth
    const homeRBs = rosters.homeRoster.filter(
      p => p.position.abbreviation === 'RB'
    )
    const awayRBs = rosters.awayRoster.filter(
      p => p.position.abbreviation === 'RB'
    )

    if (homeRBs.length < 2) {
      factors.push('Home team has limited RB depth')
    }
    if (awayRBs.length < 2) {
      factors.push('Away team has limited RB depth')
    }

    return factors
  }

  /**
   * Analyze matchup-specific factors
   */
  private static analyzeMatchupSpecifics(
    game: NFLGame,
    rosters: GameRosters
  ): string[] {
    const factors: string[] = []

    // Week-specific context
    if (game.week <= 4) {
      factors.push('Early season game with teams still establishing identity')
    } else if (game.week >= 15) {
      factors.push('Late season game with playoff implications')
    }

    // Conference matchup
    // Note: We'd need more team data to determine conferences
    // For now, we'll use team names as hints
    factors.push(
      `Matchup: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
    )

    return factors
  }

  /**
   * Get required context factors that AI must address
   */
  private static getRequiredContextFactors(gameContext: GameContext): string[] {
    const required: string[] = []

    if (
      gameContext.weather?.condition !== 'indoor' &&
      gameContext.weather?.condition !== 'clear'
    ) {
      required.push('weather_impact_on_game_plan')
    }

    if (gameContext.rivalry) {
      required.push('divisional_rivalry_dynamics')
    }

    if (gameContext.restDays < 6 || gameContext.restDays > 10) {
      required.push('rest_advantage_analysis')
    }

    if (gameContext.primeTime) {
      required.push('prime_time_performance_factors')
    }

    return required
  }

  // === Private Helper Methods ===

  private static inferWeatherConditions(game: NFLGame): GameContext['weather'] {
    // In a real implementation, this would call a weather API
    // For now, we'll use some basic inference
    return {
      condition: 'clear', // Default assumption
      temperature: 65,
      windSpeed: 5,
    }
  }

  private static analyzeInjuries(
    rosters: GameRosters
  ): GameContext['injuries'] {
    // In a real implementation, this would analyze injury reports
    // For now, return empty array
    return []
  }

  private static calculateRestDays(game: NFLGame): number {
    // Calculate based on game week and typical NFL scheduling
    // Most teams have 7 days rest, but TNF/MNF can create short rest
    return 7 // Default assumption
  }

  private static detectRivalry(game: NFLGame): boolean {
    // This would use division/rivalry data
    // For now, use simple heuristic
    const homeTeam = game.homeTeam.displayName.toLowerCase()
    const awayTeam = game.awayTeam.displayName.toLowerCase()

    // Some basic rivalry detection
    const rivalries = [
      ['patriots', 'jets'],
      ['cowboys', 'eagles'],
      ['packers', 'bears'],
      ['steelers', 'ravens'],
    ]

    return rivalries.some(
      ([team1, team2]) =>
        (homeTeam.includes(team1) && awayTeam.includes(team2)) ||
        (homeTeam.includes(team2) && awayTeam.includes(team1))
    )
  }

  private static isPlayoffGame(game: NFLGame): boolean {
    // Playoff games are typically weeks 18+
    return game.week >= 18
  }

  private static isPrimeTimeGame(game: NFLGame): boolean {
    // In real implementation, would check game time
    // For now, use week as proxy (some weeks have more prime time games)
    return game.week % 3 === 0 // Rough approximation
  }

  private static calculateHomeFieldAdvantage(game: NFLGame): number {
    // This would use historical data and stadium factors
    // For now, return moderate advantage
    return 6 // 0-10 scale, 6 is moderate home field advantage
  }

  private static inferPublicTrend(
    game: NFLGame
  ): GameContext['publicBettingTrend'] {
    // This would use betting market data
    // For now, return neutral
    return 'neutral'
  }
}
