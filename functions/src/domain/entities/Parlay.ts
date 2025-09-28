import { BaseEntity } from './BaseEntity'
import { ParlayLeg } from './ParlayLeg'

export interface GameSummary {
  matchupAnalysis: string
  gameFlow:
    | 'high_scoring_shootout'
    | 'defensive_grind'
    | 'balanced_tempo'
    | 'potential_blowout'
  keyFactors: string[]
  prediction: string
  confidence: number
}

export interface ParlayMetadata {
  provider: string
  model: string
  generatedAt: string
  varietyScore?: number
  templateRisk?: 'low' | 'medium' | 'high'
  confidence?: number
  latency?: number
  tokens?: number
  fallbackUsed?: boolean
  attemptCount?: number
}

/**
 * Parlay domain entity
 * Contains business logic for parlay-related operations
 */
export class Parlay extends BaseEntity {
  public readonly legs: ParlayLeg[]
  public readonly gameContext: string
  public readonly aiReasoning: string
  public readonly overallConfidence: number
  public readonly estimatedOdds: string
  public readonly gameSummary?: GameSummary
  public readonly metadata?: ParlayMetadata
  public readonly gameId: string

  constructor(
    id: string,
    legs: ParlayLeg[],
    gameContext: string,
    aiReasoning: string,
    overallConfidence: number,
    estimatedOdds: string,
    gameId: string,
    gameSummary?: GameSummary,
    metadata?: ParlayMetadata,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt)
    this.legs = legs
    this.gameContext = gameContext
    this.aiReasoning = aiReasoning
    this.overallConfidence = overallConfidence
    this.estimatedOdds = estimatedOdds
    this.gameId = gameId
    this.gameSummary = gameSummary
    this.metadata = metadata
  }

  /**
   * Validate the parlay entity
   */
  public validate(): boolean {
    return (
      !!this.id &&
      this.legs.length >= 2 &&
      this.legs.length <= 5 &&
      this.legs.every(leg => leg.validate()) &&
      !!this.gameContext &&
      !!this.aiReasoning &&
      this.overallConfidence >= 1 &&
      this.overallConfidence <= 10 &&
      !!this.estimatedOdds &&
      !!this.gameId
    )
  }

  /**
   * Check if parlay has conflicting legs
   */
  public hasConflictingLegs(): boolean {
    for (let i = 0; i < this.legs.length; i++) {
      for (let j = i + 1; j < this.legs.length; j++) {
        if (this.legs[i].conflictsWith(this.legs[j])) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Get parlay risk level
   */
  public getRiskLevel(): 'low' | 'medium' | 'high' {
    const legRiskLevels = this.legs.map(leg => leg.getRiskLevel())
    const highRiskCount = legRiskLevels.filter(risk => risk === 'high').length
    const mediumRiskCount = legRiskLevels.filter(
      risk => risk === 'medium'
    ).length

    if (highRiskCount >= 2) return 'high'
    if (highRiskCount === 1 || mediumRiskCount >= 2) return 'medium'
    return 'low'
  }

  /**
   * Get parlay variety score (0-1)
   */
  public getVarietyScore(): number {
    const betTypes = new Set(this.legs.map(leg => leg.betType))
    const uniqueTypes = betTypes.size
    const totalLegs = this.legs.length

    // Base variety score from unique bet types
    let varietyScore = uniqueTypes / totalLegs

    // Bonus for having different categories
    const hasTeamBets = this.legs.some(leg => leg.isTeamBet())
    const hasPlayerProps = this.legs.some(leg => leg.isPlayerProp())
    const hasGameBets = this.legs.some(leg => leg.isGameBet())
    const hasSpecialBets = this.legs.some(leg => leg.isSpecialBet())

    const categoryCount = [
      hasTeamBets,
      hasPlayerProps,
      hasGameBets,
      hasSpecialBets,
    ].filter(Boolean).length

    varietyScore += (categoryCount - 1) * 0.1

    return Math.min(1, varietyScore)
  }

  /**
   * Check if parlay follows a template pattern
   */
  public isTemplatePattern(): boolean {
    const betTypes = this.legs.map(leg => leg.betType).sort()

    // Classic template: spread + player rushing + total
    const classicTemplate = ['player_rushing', 'spread', 'total']
    if (JSON.stringify(betTypes) === JSON.stringify(classicTemplate)) {
      return true
    }

    // Generic player props template
    const playerPropsTemplate = [
      'player_passing',
      'player_rushing',
      'player_receiving',
    ]
    if (JSON.stringify(betTypes) === JSON.stringify(playerPropsTemplate)) {
      return true
    }

    // All same category
    const allTeamBets = this.legs.every(leg => leg.isTeamBet())
    const allPlayerProps = this.legs.every(leg => leg.isPlayerProp())

    return allTeamBets || allPlayerProps
  }

  /**
   * Get template risk level
   */
  public getTemplateRisk(): 'low' | 'medium' | 'high' {
    if (!this.isTemplatePattern()) return 'low'

    const varietyScore = this.getVarietyScore()
    if (varietyScore >= 0.8) return 'low'
    if (varietyScore >= 0.6) return 'medium'
    return 'high'
  }

  /**
   * Get parlay confidence level
   */
  public getConfidenceLevel(): 'low' | 'medium' | 'high' {
    if (this.overallConfidence <= 4) return 'low'
    if (this.overallConfidence <= 7) return 'medium'
    return 'high'
  }

  /**
   * Get parlay legs by bet type
   */
  public getLegsByBetType(betType: string): ParlayLeg[] {
    return this.legs.filter(leg => leg.betType === betType)
  }

  /**
   * Get parlay legs by risk level
   */
  public getLegsByRiskLevel(riskLevel: 'low' | 'medium' | 'high'): ParlayLeg[] {
    return this.legs.filter(leg => leg.getRiskLevel() === riskLevel)
  }

  /**
   * Check if parlay is balanced (good mix of risk levels)
   */
  public isBalanced(): boolean {
    const riskLevels = this.legs.map(leg => leg.getRiskLevel())
    const uniqueRiskLevels = new Set(riskLevels).size
    return uniqueRiskLevels >= 2
  }

  /**
   * Get parlay summary for display
   */
  public getSummary(): {
    matchup: string
    legCount: number
    riskLevel: string
    confidenceLevel: string
    varietyScore: number
    isTemplate: boolean
    templateRisk: string
  } {
    return {
      matchup: this.gameContext,
      legCount: this.legs.length,
      riskLevel: this.getRiskLevel(),
      confidenceLevel: this.getConfidenceLevel(),
      varietyScore: this.getVarietyScore(),
      isTemplate: this.isTemplatePattern(),
      templateRisk: this.getTemplateRisk(),
    }
  }

  /**
   * Create a copy of the parlay with updated confidence
   */
  public withUpdatedConfidence(newConfidence: number): Parlay {
    return new Parlay(
      this.id,
      this.legs,
      this.gameContext,
      this.aiReasoning,
      newConfidence,
      this.estimatedOdds,
      this.gameId,
      this.gameSummary,
      this.metadata,
      this.createdAt,
      new Date()
    )
  }

  /**
   * Create a copy of the parlay with updated reasoning
   */
  public withUpdatedReasoning(newReasoning: string): Parlay {
    return new Parlay(
      this.id,
      this.legs,
      this.gameContext,
      newReasoning,
      this.overallConfidence,
      this.estimatedOdds,
      this.gameId,
      this.gameSummary,
      this.metadata,
      this.createdAt,
      new Date()
    )
  }
}
