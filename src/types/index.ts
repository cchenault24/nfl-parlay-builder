export * from '@npb/shared'

// Frontend-specific imports that need Firebase types
import type * as Shared from '@npb/shared'
import type { Timestamp } from 'firebase/firestore'

// Type aliases for convenience (not duplicates)
export type {
  GameSummary,
  GeneratedParlay,
  ParlayLeg,
  ParlayOptions,
  StrategyConfig,
  VarietyFactors,
} from '@npb/shared'

// ONLY frontend-specific types that shared package can't know about
export type BetType = 'spread' | 'total' | 'moneyline' | 'player_prop'

// NFL types with frontend-specific augmentations
export interface NFLTeam extends Omit<Shared.NFLTeam, 'name'> {
  name?: string
}

export interface NFLPlayer extends Shared.NFLPlayer {
  name?: string
  jerseyNumber?: string
  experience?: number
  college?: string
}

export interface GameRosters extends Shared.GameRosters {
  homeRoster?: NFLPlayer[]
  awayRoster?: NFLPlayer[]
}

// Frontend-specific data models (not in shared because backend doesn't need them)
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

// Auth types (Firebase-specific, can't be in shared)
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Timestamp
  savedParlays?: string[]
}

// Type intersection for Frontend GeneratedParlay with Firebase Timestamp
export interface FrontendGeneratedParlay extends Shared.GeneratedParlay {
  savedAt?: Timestamp // Properly typed for Firebase
}

export interface FrontendSavedParlay extends FrontendGeneratedParlay {
  userId: string
  savedAt: Timestamp
}
