import { BetType } from './index'

// ===== CHAIN-OF-THOUGHT REASONING TYPES =====

/**
 * Step-by-step analytical process for each bet recommendation
 */
export interface AnalyticalStep {
  step: number
  description: string
  reasoning: string
  dataSource: string // What data/information informed this step
  conclusion: string // What this step concluded
}

/**
 * Data sources that can be cited in reasoning
 */
export type DataSource =
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
export interface DataCitation {
  source: DataSource
  specificData: string // e.g., "Joe Burrow: 275 passing yards/game vs Denver defense"
  relevance: string // Why this data point matters for the bet
}

/**
 * Confidence justification with specific reasoning
 */
export interface ConfidenceJustification {
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
 * Overall parlay reasoning that ties individual legs together
 */
export interface ParlayChainOfThought {
  strategicApproach: string // Overall analytical approach taken
  legSynergies: string[] // How the legs work together (or independently)
  overallRiskProfile: string // Combined risk assessment
  hedgingOpportunities: string[] // Potential ways to hedge risk
  scenarioAnalysis: {
    bestCase: string // If everything goes right
    worstCase: string // If everything goes wrong
    mostLikely: string // Most probable outcome
  }
  confidenceCalibration: {
    overallScore: number
    legInteractions: string // How leg outcomes might affect each other
    keyAssumptions: string[] // Critical assumptions underlying the parlay
  }
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

// ===== ENHANCED PARLAY LEG TYPE =====

/**
 * Enhanced parlay leg with chain-of-thought reasoning
 * Extends the existing ParlayLeg from your current types
 */
export interface EnhancedParlayLeg {
  id: string
  betType: BetType
  selection: string
  target: string

  // Enhanced reasoning structure
  chainOfThought: ChainOfThoughtReasoning

  // Quick summary (for UI display) - maps to existing 'reasoning' field
  reasoningSummary: string

  confidence: number
  odds: string

  // Validation status
  validation?: ReasoningValidation
}

/**
 * Enhanced generated parlay with comprehensive reasoning
 * Extends the existing GeneratedParlay from your current types
 */
export interface EnhancedGeneratedParlay {
  id: string
  legs: [EnhancedParlayLeg, EnhancedParlayLeg, EnhancedParlayLeg]
  gameContext: string

  // Enhanced AI reasoning
  parlayChainOfThought: ParlayChainOfThought

  // Quick summary for UI (maps to existing 'aiReasoning' field)
  aiReasoning: string

  overallConfidence: number
  estimatedOdds: string
  createdAt: string
  savedAt?: any

  // Analysis metadata
  analysisMetadata: {
    strategyUsed: string
    dataSourcesCount: number
    reasoningStepsTotal: number
    validationScore: number // 1-10
  }
}

// ===== PROMPT CONFIGURATION TYPES =====

/**
 * Configuration for chain-of-thought prompting
 */
export interface ChainOfThoughtConfig {
  requireMinimumSteps: number // Minimum analytical steps required
  requireDataCitations: boolean // Whether data citations are mandatory
  includeValidationPrompt: boolean // Whether to include self-validation
  confidenceJustificationDepth: 'basic' | 'detailed' | 'comprehensive'
  allowUncertaintyAcknowledgment: boolean // Whether AI can express uncertainty
}

/**
 * Template structure for reasoning prompts
 */
export interface ReasoningPromptTemplate {
  systemPrompt: string
  chainOfThoughtInstructions: string
  dataRequirements: string
  validationInstructions: string
  outputFormatTemplate: string
}
