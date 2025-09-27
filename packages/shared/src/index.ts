// packages/shared/src/index.ts - Individual exports to avoid module resolution issues
export {
  DEFAULT_STRATEGIES,
  DEFAULT_VARIETY_FACTORS,
  // Error Types
  type CloudFunctionError,
  type GameRosters,
  // Parlay Types
  type GameSummary,
  type GeneratedParlay,
  type GenerateParlayRequest,
  type GenerateParlayResponse,
  type InjuryReport,
  type MarketLine,
  type NFLGame,
  type NFLPlayer,
  // NFL Types
  type NFLTeam,
  type ParlayGenerationResult,
  type ParlayLeg,
  type ParlayOptions,
  type Position,
  type SavedParlay,
  // Strategy Types
  type StrategyConfig,
  type Trend,
  type UnifiedGameData,
  type VarietyFactors,
  // Data Types
  type Weather,
} from './types.js'
