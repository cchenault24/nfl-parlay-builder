/**
 * Strategy value object
 * Represents parlay generation strategy with validation and business logic
 */
export class Strategy {
  public readonly name: string
  public readonly description: string
  public readonly riskLevel: 'conservative' | 'moderate' | 'aggressive'
  public readonly temperature: number
  public readonly focusAreas: string[]
  public readonly betTypeWeights: Record<string, number>
  public readonly contextFactors: string[]
  public readonly confidenceRange: [number, number]
  public readonly preferredGameScripts: string[]

  constructor(
    name: string,
    description: string,
    riskLevel: 'conservative' | 'moderate' | 'aggressive',
    temperature: number,
    focusAreas: string[],
    betTypeWeights: Record<string, number> = {},
    contextFactors: string[] = [],
    confidenceRange: [number, number] = [5, 9],
    preferredGameScripts: string[] = []
  ) {
    this.name = this.validateName(name)
    this.description = this.validateDescription(description)
    this.riskLevel = this.validateRiskLevel(riskLevel)
    this.temperature = this.validateTemperature(temperature)
    this.focusAreas = this.validateFocusAreas(focusAreas)
    this.betTypeWeights = this.validateBetTypeWeights(betTypeWeights)
    this.contextFactors = this.validateContextFactors(contextFactors)
    this.confidenceRange = this.validateConfidenceRange(confidenceRange)
    this.preferredGameScripts =
      this.validatePreferredGameScripts(preferredGameScripts)
  }

  /**
   * Validate strategy name
   */
  private validateName(name: string): string {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Strategy name is required')
    }
    return name.trim()
  }

  /**
   * Validate strategy description
   */
  private validateDescription(description: string): string {
    if (
      !description ||
      typeof description !== 'string' ||
      description.trim().length === 0
    ) {
      throw new Error('Strategy description is required')
    }
    return description.trim()
  }

  /**
   * Validate risk level
   */
  private validateRiskLevel(
    riskLevel: string
  ): 'conservative' | 'moderate' | 'aggressive' {
    if (!['conservative', 'moderate', 'aggressive'].includes(riskLevel)) {
      throw new Error(
        'Risk level must be conservative, moderate, or aggressive'
      )
    }
    return riskLevel as 'conservative' | 'moderate' | 'aggressive'
  }

  /**
   * Validate temperature
   */
  private validateTemperature(temperature: number): number {
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      throw new Error('Temperature must be a number between 0 and 2')
    }
    return temperature
  }

  /**
   * Validate focus areas
   */
  private validateFocusAreas(focusAreas: string[]): string[] {
    if (!Array.isArray(focusAreas)) {
      throw new Error('Focus areas must be an array')
    }
    const validAreas = ['offense', 'defense', 'special_teams', 'balanced']
    const invalidAreas = focusAreas.filter(area => !validAreas.includes(area))
    if (invalidAreas.length > 0) {
      throw new Error(`Invalid focus areas: ${invalidAreas.join(', ')}`)
    }
    return focusAreas
  }

  /**
   * Validate bet type weights
   */
  private validateBetTypeWeights(
    weights: Record<string, number>
  ): Record<string, number> {
    if (typeof weights !== 'object' || weights === null) {
      return {}
    }

    const validBetTypes = [
      'spread',
      'total',
      'moneyline',
      'player_prop',
      'player_passing',
      'player_rushing',
      'player_receiving',
      'team_total',
      'first_touchdown',
      'defensive_props',
    ]

    const validatedWeights: Record<string, number> = {}
    for (const [betType, weight] of Object.entries(weights)) {
      if (
        validBetTypes.includes(betType) &&
        typeof weight === 'number' &&
        weight >= 0
      ) {
        validatedWeights[betType] = weight
      }
    }

    return validatedWeights
  }

  /**
   * Validate context factors
   */
  private validateContextFactors(factors: string[]): string[] {
    if (!Array.isArray(factors)) {
      return []
    }
    const validFactors = [
      'weather',
      'injuries',
      'rest',
      'home_field',
      'recent_form',
      'rivalry',
      'motivation',
      'pace',
      'efficiency',
      'matchup',
    ]
    return factors.filter(factor => validFactors.includes(factor))
  }

  /**
   * Validate confidence range
   */
  private validateConfidenceRange(range: [number, number]): [number, number] {
    if (!Array.isArray(range) || range.length !== 2) {
      return [5, 9]
    }
    const [min, max] = range
    if (typeof min !== 'number' || typeof max !== 'number') {
      return [5, 9]
    }
    if (min < 1 || max > 10 || min > max) {
      return [5, 9]
    }
    return [min, max]
  }

  /**
   * Validate preferred game scripts
   */
  private validatePreferredGameScripts(scripts: string[]): string[] {
    if (!Array.isArray(scripts)) {
      return []
    }
    const validScripts = [
      'high_scoring',
      'defensive',
      'blowout',
      'close_game',
      'balanced_tempo',
      'fast_pace',
      'slow_pace',
    ]
    return scripts.filter(script => validScripts.includes(script))
  }

  /**
   * Get strategy risk multiplier
   */
  public getRiskMultiplier(): number {
    switch (this.riskLevel) {
      case 'conservative':
        return 0.7
      case 'moderate':
        return 1.0
      case 'aggressive':
        return 1.5
      default:
        return 1.0
    }
  }

  /**
   * Get bet type weight for a specific bet type
   */
  public getBetTypeWeight(betType: string): number {
    return this.betTypeWeights[betType] || 1.0
  }

  /**
   * Check if strategy focuses on a specific area
   */
  public focusesOn(area: string): boolean {
    return this.focusAreas.includes(area)
  }

  /**
   * Check if strategy prefers a specific game script
   */
  public prefersGameScript(script: string): boolean {
    return this.preferredGameScripts.includes(script)
  }

  /**
   * Get adjusted confidence for risk level
   */
  public getAdjustedConfidence(baseConfidence: number): number {
    const riskMultiplier = this.getRiskMultiplier()
    const adjusted = baseConfidence * riskMultiplier
    return Math.max(
      this.confidenceRange[0],
      Math.min(this.confidenceRange[1], adjusted)
    )
  }

  /**
   * Check if confidence is within strategy range
   */
  public isConfidenceInRange(confidence: number): boolean {
    return (
      confidence >= this.confidenceRange[0] &&
      confidence <= this.confidenceRange[1]
    )
  }

  /**
   * Get strategy summary
   */
  public getSummary(): {
    name: string
    riskLevel: string
    focusAreas: string[]
    temperature: number
    confidenceRange: [number, number]
    preferredScripts: string[]
  } {
    return {
      name: this.name,
      riskLevel: this.riskLevel,
      focusAreas: this.focusAreas,
      temperature: this.temperature,
      confidenceRange: this.confidenceRange,
      preferredScripts: this.preferredGameScripts,
    }
  }

  /**
   * Create a copy with updated bet type weights
   */
  public withBetTypeWeights(weights: Record<string, number>): Strategy {
    return new Strategy(
      this.name,
      this.description,
      this.riskLevel,
      this.temperature,
      this.focusAreas,
      weights,
      this.contextFactors,
      this.confidenceRange,
      this.preferredGameScripts
    )
  }

  /**
   * Create a copy with updated focus areas
   */
  public withFocusAreas(focusAreas: string[]): Strategy {
    return new Strategy(
      this.name,
      this.description,
      this.riskLevel,
      this.temperature,
      focusAreas,
      this.betTypeWeights,
      this.contextFactors,
      this.confidenceRange,
      this.preferredGameScripts
    )
  }

  /**
   * Create predefined strategies
   */
  public static conservative(): Strategy {
    return new Strategy(
      'Conservative Strategy',
      'Low-risk approach focusing on high-probability bets',
      'conservative',
      0.3,
      ['balanced'],
      {
        spread: 0.3,
        total: 0.3,
        moneyline: 0.2,
        player_passing: 0.1,
        player_rushing: 0.1,
      },
      ['weather', 'injuries', 'home_field'],
      [6, 9],
      ['close_game', 'balanced_tempo']
    )
  }

  public static moderate(): Strategy {
    return new Strategy(
      'Moderate Strategy',
      'Balanced approach with mix of risk levels',
      'moderate',
      0.7,
      ['offense', 'defense'],
      {
        spread: 0.25,
        total: 0.25,
        player_passing: 0.2,
        player_rushing: 0.15,
        player_receiving: 0.15,
      },
      ['weather', 'injuries', 'recent_form', 'matchup'],
      [5, 8],
      ['balanced_tempo', 'close_game']
    )
  }

  public static aggressive(): Strategy {
    return new Strategy(
      'Aggressive Strategy',
      'High-risk approach with exotic bets and player props',
      'aggressive',
      1.2,
      ['offense'],
      {
        player_passing: 0.3,
        player_rushing: 0.25,
        player_receiving: 0.25,
        first_touchdown: 0.1,
        defensive_props: 0.1,
      },
      ['motivation', 'rivalry', 'pace', 'efficiency'],
      [4, 7],
      ['high_scoring', 'fast_pace']
    )
  }
}
