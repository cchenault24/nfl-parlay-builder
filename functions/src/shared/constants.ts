// functions/src/shared/constants.ts

import { ParlayOptions } from './types'

/**
 * Default strategies available to the AI when constructing parlays.
 * Keep names stable—these seed prompts & UI dropdowns.
 */
export const DEFAULT_STRATEGIES: string[] = [
  'High Confidence (safer, lower payout)',
  'Balanced (mix of spread/props/totals)',
  'High Risk, High Reward',
]

/**
 * Default parlay options used when no explicit options are provided.
 */
export const DEFAULT_PARLAY_OPTIONS: ParlayOptions = {
  gameId: '',
  numLegs: 3,
  strategies: DEFAULT_STRATEGIES,
}
