// ================================================================================================
// PARLAY DATA TYPES - Specific interfaces for parlay-related data structures
// ================================================================================================

export interface RawParlayLeg {
  id?: string
  betType?: string
  selection?: string
  target?: string
  reasoning?: string
  confidence?: number
  odds?: string
}

export interface RawGameSummary {
  matchupAnalysis?: string
  gameFlow?: string
  keyFactors?: string[]
  prediction?: string
  confidence?: number
}

export interface RawAIParsedResponse {
  legs?: RawParlayLeg[]
  overallConfidence?: number
  estimatedOdds?: string
  reasoning?: string
  gameSummary?: RawGameSummary
}

export interface ProviderConfigData {
  [key: string]: string | number | boolean | string[] | ProviderConfigData
}

export interface CloudFunctionData {
  parlay?: RawAIParsedResponse
  [key: string]: unknown
}
