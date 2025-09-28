import { BaseEntity } from './BaseEntity'

export type BetType =
  | 'spread'
  | 'total'
  | 'moneyline'
  | 'player_prop'
  | 'player_passing'
  | 'player_rushing'
  | 'player_receiving'
  | 'team_total'
  | 'first_touchdown'
  | 'defensive_props'

/**
 * Parlay Leg domain entity
 * Represents a single bet within a parlay
 */
export class ParlayLeg extends BaseEntity {
  public readonly betType: BetType
  public readonly selection: string
  public readonly target: string
  public readonly reasoning: string
  public readonly confidence: number
  public readonly odds: string

  constructor(
    id: string,
    betType: BetType,
    selection: string,
    target: string,
    reasoning: string,
    confidence: number,
    odds: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt)
    this.betType = betType
    this.selection = selection
    this.target = target
    this.reasoning = reasoning
    this.confidence = confidence
    this.odds = odds
  }

  /**
   * Validate the parlay leg entity
   */
  public validate(): boolean {
    return (
      !!this.id &&
      !!this.betType &&
      !!this.selection &&
      !!this.target &&
      !!this.reasoning &&
      this.confidence >= 1 &&
      this.confidence <= 10 &&
      !!this.odds
    )
  }

  /**
   * Check if this is a player prop bet
   */
  public isPlayerProp(): boolean {
    return this.betType.startsWith('player_')
  }

  /**
   * Check if this is a team bet
   */
  public isTeamBet(): boolean {
    return ['spread', 'moneyline', 'team_total'].includes(this.betType)
  }

  /**
   * Check if this is a game bet
   */
  public isGameBet(): boolean {
    return this.betType === 'total'
  }

  /**
   * Check if this is a special bet
   */
  public isSpecialBet(): boolean {
    return ['first_touchdown', 'defensive_props'].includes(this.betType)
  }

  /**
   * Get the position required for this bet type
   */
  public getRequiredPosition(): string | null {
    switch (this.betType) {
      case 'player_passing':
        return 'QB'
      case 'player_rushing':
        return 'RB'
      case 'player_receiving':
        return 'WR'
      case 'first_touchdown':
        return 'RB'
      case 'defensive_props':
        return 'DE'
      default:
        return null
    }
  }

  /**
   * Get confidence level as string
   */
  public getConfidenceLevel(): 'low' | 'medium' | 'high' {
    if (this.confidence <= 4) return 'low'
    if (this.confidence <= 7) return 'medium'
    return 'high'
  }

  /**
   * Check if this leg conflicts with another leg
   */
  public conflictsWith(other: ParlayLeg): boolean {
    // Spread and moneyline conflict
    if (
      (this.betType === 'spread' && other.betType === 'moneyline') ||
      (this.betType === 'moneyline' && other.betType === 'spread')
    ) {
      return true
    }

    // Total and team total conflict
    if (
      (this.betType === 'total' && other.betType === 'team_total') ||
      (this.betType === 'team_total' && other.betType === 'total')
    ) {
      return true
    }

    // Same player, different props
    if (
      this.isPlayerProp() &&
      other.isPlayerProp() &&
      this.selection === other.selection &&
      this.betType !== other.betType
    ) {
      return true
    }

    return false
  }

  /**
   * Get risk level based on bet type and confidence
   */
  public getRiskLevel(): 'low' | 'medium' | 'high' {
    const baseRisk = this.getBaseRiskLevel()
    const confidenceModifier =
      this.confidence <= 5 ? 1 : this.confidence <= 8 ? 0.5 : 0

    if (baseRisk === 'high' || confidenceModifier === 1) return 'high'
    if (baseRisk === 'medium' || confidenceModifier === 0.5) return 'medium'
    return 'low'
  }

  /**
   * Get base risk level for bet type
   */
  private getBaseRiskLevel(): 'low' | 'medium' | 'high' {
    switch (this.betType) {
      case 'moneyline':
      case 'total':
        return 'low'
      case 'spread':
      case 'team_total':
      case 'player_passing':
      case 'player_rushing':
      case 'player_receiving':
        return 'medium'
      case 'first_touchdown':
      case 'defensive_props':
        return 'high'
      default:
        return 'medium'
    }
  }

  /**
   * Create a copy of the leg with updated confidence
   */
  public withConfidence(newConfidence: number): ParlayLeg {
    return new ParlayLeg(
      this.id,
      this.betType,
      this.selection,
      this.target,
      this.reasoning,
      newConfidence,
      this.odds,
      this.createdAt,
      new Date()
    )
  }

  /**
   * Create a copy of the leg with updated reasoning
   */
  public withReasoning(newReasoning: string): ParlayLeg {
    return new ParlayLeg(
      this.id,
      this.betType,
      this.selection,
      this.target,
      newReasoning,
      this.confidence,
      this.odds,
      this.createdAt,
      new Date()
    )
  }
}
