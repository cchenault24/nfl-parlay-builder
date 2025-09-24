export interface StrategyConfig {
  name: string
  // add knobs as you formalize them
}

export interface VarietyFactors {
  strategy?: string
  focusArea?: string
  playerTier?: string
  gameScript?: string
  marketBias?: string
}

export interface ParlayOptions {
  strategy?: string
  variety?: VarietyFactors
  riskTolerance?: number
  temperature?: number
  maxLegs?: number
}

export interface GeneratedParlay {
  gameId: string
  legs: Array<{
    type: 'spread' | 'total' | 'moneyline' | 'player_prop'
    selection: string
    threshold?: number
    price?: number
    rationale?: string
  }>
  notes?: string
}

export interface GenerateParlayRequest {
  gameId: string
  options?: ParlayOptions
}

export interface GenerateParlayResponse {
  success: boolean
  data?: GeneratedParlay
  error?: { code?: string; message: string; details?: unknown }
}
