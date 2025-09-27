// ------------------------------------------------------------------------------------------------
// ESPN API types (SINGLE SOURCE OF TRUTH)
// ------------------------------------------------------------------------------------------------
export interface ESPNTeam {
  id: string
  name: string
  displayName: string
  abbreviation: string
  color?: string
  alternateColor?: string
  logo: string
}

export interface ESPNCompetitor {
  id: string
  homeAway: 'home' | 'away'
  team: ESPNTeam
}

export interface ESPNCompetition {
  id: string
  competitors: ESPNCompetitor[]
}

export interface ESPNEvent {
  id: string
  date: string
  competitions: ESPNCompetition[]
  week?: {
    number: number
  }
  season?: {
    year: number
  }
  status?: {
    type: {
      name: string
    }
  }
}

export interface ESPNScoreboardResponse {
  events: ESPNEvent[]
  week?: {
    number: number
  }
  season?: {
    year: number
  }
}

export interface ESPNAthlete {
  id: string
  displayName: string
  fullName?: string
  position?: {
    name: string
    abbreviation: string
  }
  jersey?: string
  experience?: {
    years: number
  }
  college?: {
    name: string
  }
}

export interface ESPNRosterResponse {
  athletes: Array<{
    position?: string
    items: ESPNAthlete[]
  }>
}

export interface ESPNErrorResponse {
  message?: string
  error?: string
  status?: number
}

export type ESPNRequestData = Record<string, unknown> | FormData | string | null
export type ESPNResponseData =
  | ESPNScoreboardResponse
  | ESPNRosterResponse
  | ESPNErrorResponse
  | unknown
