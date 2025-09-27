// src/shared/constants.ts

import { ParlayOptions, VarietyFactors } from './types'

/**
 * Default strategies to seed the parlay generation process.
 * These can be shown in dropdowns or passed into AI prompts.
 */
export const DEFAULT_STRATEGIES: string[] = [
  'High Confidence (safer, lower payout)',
  'Balanced (mix of spread/props/totals)',
  'High Risk, High Reward',
]
export const DEFAULT_VARIETY_FACTORS: VarietyFactors = {
  strategy: 'balanced',
  focusArea: 'matchup_based',
  playerTier: 'all_players',
  gameScript: 'competitive',
  marketBias: 'neutral',
  riskTolerance: 5,
}
/**
 * Example default parlay options to use if none are supplied.
 */
export const DEFAULT_PARLAY_OPTIONS: ParlayOptions = {
  gameId: '',
  numLegs: 3,
  strategies: DEFAULT_STRATEGIES,
}
