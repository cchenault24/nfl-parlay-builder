// Core domain: re-export everything from the shared package
export * from '@npb/shared'

import type * as Shared from '@npb/shared'
import type { Timestamp } from 'firebase/firestore'

/**
 * App-specific augmentations and legacy shapes.
 * We use TypeScript declaration merging to add optional fields
 * so we don't break the shared contracts or the server payloads.
 *
 * Nothing is renamed — we extend the existing names in place.
 */

// ===== BET TYPES (app) =====
export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop'

// ===== NFL TYPES (app augments) =====

// Some UI code expects `team.name` in addition to shared fields.
// Make it optional to avoid breaking server payloads that don't send it.
export interface NFLTeam extends Shared.NFLTeam {
  /** Legacy/UI convenience — prefer `displayName` going forward */
  name?: string
}

// Some UI code expects roster arrays under `homeRoster`/`awayRoster`.
// Shared uses { home: NFLPlayer[]; away: NFLPlayer[] }.
// Add optional aliases so existing UI can read them without changing server.
export interface GameRosters extends Shared.GameRosters {
  homeRoster?: NFLPlayer[]
  awayRoster?: NFLPlayer[]
}

// Some UI code expects richer player fields.
export interface NFLPlayer extends Shared.NFLPlayer {
  name?: string
  jerseyNumber?: string
  experience?: number
  college?: string
}

// Additional app-only data models (not in shared)
export interface TeamStats {
  teamId: string
  passingYards: number
  rushingYards: number
  totalYards: number
  pointsPerGame: number
  pointsAllowed: number
  turnovers: number
  record: string
}

export interface PlayerStats {
  playerId: string
  name: string
  position: string
  teamId: string
  passingYards?: number
  rushingYards?: number
  receivingYards?: number
  touchdowns: number
  receptions?: number
}

export interface NewsItem {
  title: string
  description: string
  publishedDate: string
  url: string
  teamIds: string[]
}

// ===== PARLAY TYPES (app augments) =====

export interface ParlayLeg {
  id: string
  betType: BetType
  selection: string
  target: string
  reasoning: string
  confidence: number
  odds: string
}

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

/**
 * Shared GeneratedParlay is the minimum server contract.
 * The UI expects more fields — add them as OPTIONAL so we don't
 * force the server to provide them during the migration.
 */
export interface GeneratedParlay extends Shared.GeneratedParlay {
  id?: string
  gameContext?: string
  aiReasoning?: string
  overallConfidence?: number
  estimatedOdds?: string
  createdAt?: string
  savedAt?: Timestamp
  gameSummary?: GameSummary
}

export interface ParlayGenerationResult {
  parlay: GeneratedParlay
  rateLimitInfo?: {
    remaining: number
    total: number
    resetTime: string
    currentCount: number
  }
}

export interface ParlayRequest {
  gameId: string
  legCount: 3
}

// ===== AUTH TYPES (app) =====

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[]
}

export interface SavedParlay extends GeneratedParlay {
  userId: string
  savedAt: Timestamp
}
