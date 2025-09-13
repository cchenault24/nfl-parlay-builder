// ===== CHAIN-OF-THOUGHT REASONING TYPES =====

/**
 * Step-by-step analytical process for each bet recommendation
 */
interface AnalyticalStep {
  step: number
  description: string
  reasoning: string
  dataSource: string // What data/information informed this step
  conclusion: string // What this step concluded
}

/**
 * Data sources that can be cited in reasoning
 */
type DataSource =
  | 'roster_data'
  | 'team_stats'
  | 'player_performance'
  | 'matchup_analysis'
  | 'situational_factors'
  | 'betting_strategy'
  | 'historical_trends'
  | 'injury_report'
  | 'weather_conditions'
  | 'team_news'

/**
 * Citation for specific data points used in reasoning
 */
interface DataCitation {
  source: DataSource
  specificData: string // e.g., "Joe Burrow: 275 passing yards/game vs Denver defense"
  relevance: string // Why this data point matters for the bet
}

/**
 * Confidence justification with specific reasoning
 */
interface ConfidenceJustification {
  score: number // 1-10
  primaryFactors: string[] // Main reasons for this confidence level
  riskFactors: string[] // What could go wrong
  supportingData: DataCitation[] // Specific data supporting the confidence
  uncertainties: string[] // Known unknowns or areas of doubt
}

/**
 * Enhanced reasoning structure for individual parlay legs
 */
export interface ChainOfThoughtReasoning {
  analyticalSteps: AnalyticalStep[] // Step-by-step thought process
  keyDataPoints: DataCitation[] // All data sources referenced
  strategicRationale: string // How this fits the betting strategy
  riskAssessment: {
    likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
    primaryRisks: string[]
    mitigation: string // Why we still recommend despite risks
  }
  confidenceBreakdown: ConfidenceJustification
  alternativeConsiderations: string[] // Other bets considered and why rejected
}

/**
 * Validation criteria for reasoning consistency
 */
export interface ReasoningValidation {
  isLogicallyConsistent: boolean
  hasRequiredSteps: boolean
  includesDataCitations: boolean
  confidenceIsJustified: boolean
  strategicAlignmentScore: number // 1-10, how well reasoning aligns with strategy
  validationErrors: string[] // Any identified inconsistencies
}
