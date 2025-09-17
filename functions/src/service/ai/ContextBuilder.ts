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
  PlayerInjury,
} from './BaseParlayProvider'

/**
 * Service responsible for building rich context for AI parlay generation
 * This helps prevent template responses by providing game-specific insights
 */
export class ContextBuilder {
  /**
   * Build the full parlay generation context
   */
  static buildContext(
    game: NFLGame,
    rosters: GameRosters,
    strategy: StrategyConfig,
    varietyFactors: VarietyFactors
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
      antiTemplateHints,
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
      isRivalry: this.detectRivalry(game),
      isPlayoffs: this.isPlayoffGame(game),
      isPrimeTime: this.isPrimeTimeGame(game),
      venue: {
        type: this.inferVenueType(game),
        surface: this.inferSurface(game),
        homeFieldAdvantage: this.calculateHomeFieldAdvantage(game),
      },
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
      recentBetTypes: [], // to be populated by tracking service later
      avoidPatterns: [
        'home team advantage',
        'recent form suggests',
        'both teams have',
        'expect a competitive game',
        'value in this bet',
      ],
      emphasizeUnique: gameSpecifics,
      contextualFactors: this.getRequiredContextFactors(gameContext),
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

    // Weather signal if relevant
    if (
      gameContext.weather?.condition !== 'indoor' &&
      gameContext.weather?.condition !== 'clear'
    ) {
      factors.push(
        `Weather impact: ${gameContext.weather?.condition} conditions expected`
      )
    }

    // Rest advantage/disadvantage
    const minRest = Math.min(
      gameContext.restDays.home,
      gameContext.restDays.away
    )
    const maxRest = Math.max(
      gameContext.restDays.home,
      gameContext.restDays.away
    )
    if (minRest < 6) {
      factors.push(
        `Short rest situation: home ${gameContext.restDays.home}d, away ${gameContext.restDays.away}d`
      )
    } else if (maxRest > 10) {
      factors.push(
        `Extended rest: home ${gameContext.restDays.home}d, away ${gameContext.restDays.away}d`
      )
    }

    // Division/rivalry context
    if (gameContext.isRivalry) {
      factors.push('Divisional rivalry game with historical significance')
    }

    // Prime time spotlight
    if (gameContext.isPrimeTime) {
      factors.push('Prime time game with national audience')
    }

    // Playoff implications
    if (gameContext.isPlayoffs) {
      factors.push('Playoff implications affecting team motivation')
    }

    // Slight home-field skew
    const hfa =
      gameContext.venue?.homeFieldAdvantage ??
      this.calculateHomeFieldAdvantage(game)
    if (hfa >= 7) {
      factors.push('Strong home-field advantage environment')
    }

    return factors
  }

  /**
   * Contextual factors that the AI should always address if present
   */
  private static getRequiredContextFactors(gameContext: GameContext): string[] {
    const required: string[] = []

    if (
      gameContext.weather?.condition &&
      gameContext.weather.condition !== 'indoor' &&
      gameContext.weather.condition !== 'clear'
    ) {
      required.push('weather_impact_on_game_plan')
    }

    if (gameContext.isRivalry) {
      required.push('divisional_rivalry_dynamics')
    }

    const minRest = Math.min(
      gameContext.restDays.home,
      gameContext.restDays.away
    )
    const maxRest = Math.max(
      gameContext.restDays.home,
      gameContext.restDays.away
    )
    if (minRest < 6 || maxRest > 10) {
      required.push('rest_advantage_analysis')
    }

    if (gameContext.isPrimeTime) {
      required.push('prime_time_performance_factors')
    }

    if (gameContext.isPlayoffs) {
      required.push('playoff_pressure_and_rotations')
    }

    return required
  }

  /**
   * Placeholder injuries analyzer
   */
  private static analyzeInjuries(_rosters: GameRosters): PlayerInjury[] {
    // In your real code, collect questionable/doubtful/out designations
    return []
  }

  /**
   * Placeholder weather inference
   */
  private static inferWeatherConditions(_game: NFLGame):
    | {
        condition: 'clear' | 'rain' | 'snow' | 'wind' | 'indoor'
        tempF?: number
      }
    | undefined {
    // If you have a weather service, look it up here
    return { condition: 'clear' }
  }

  /**
   * Infer venue type from game metadata if available, else default.
   */
  private static inferVenueType(game: NFLGame): 'dome' | 'outdoor' {
    const name = (game as any)?.venue?.toString().toLowerCase?.() || ''
    if (name.includes('dome')) return 'dome'
    if ((game as any)?.isDome === true) return 'dome'
    return 'outdoor'
  }

  /**
   * Infer playing surface from game metadata if available, else default.
   */
  private static inferSurface(game: NFLGame): 'grass' | 'turf' {
    const surface = (game as any)?.surface?.toString().toLowerCase?.() || ''
    if (surface.includes('grass')) return 'grass'
    if (surface.includes('turf')) return 'turf'
    return 'turf'
  }

  /**
   * Calculate rest days for home/away as a pair
   */
  private static calculateRestDays(_game: NFLGame): {
    home: number
    away: number
  } {
    // Implement from schedule if available; default to symmetrical 7/7
    return { home: 7, away: 7 }
  }

  private static detectRivalry(_game: NFLGame): boolean {
    return false
  }

  private static isPlayoffGame(_game: NFLGame): boolean {
    return false
  }

  private static isPrimeTimeGame(_game: NFLGame): boolean {
    return false
  }

  private static calculateHomeFieldAdvantage(_game: NFLGame): number {
    // 0..10; tune if you have stadium/altitude data
    return 6
  }
}

export default ContextBuilder
