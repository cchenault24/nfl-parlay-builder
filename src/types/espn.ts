export interface ESPNScoreboardResponse {
  events: ESPNEvent[]
  season: {
    type: number
    year: number
  }
  week: {
    number: number
  }
}

export interface ESPNEvent {
  id: string
  date: string
  name: string
  shortName: string
  season: {
    year: number
    type: number
    slug: string
  }
  week: {
    number: number
  }
  status: {
    type: {
      id: string
      name: string
      state: string
      completed: boolean
      description: string
      detail: string
      shortDetail: string
    }
  }
  competitions: ESPNCompetition[]
}

export interface ESPNCompetition {
  id: string
  date: string
  competitors: ESPNCompetitor[]
  venue?: {
    fullName: string
    address: {
      city: string
      state: string
    }
  }
}

interface ESPNCompetitor {
  id: string
  type: string
  order: number
  homeAway: 'home' | 'away'
  team: {
    id: string
    location: string
    name: string
    abbreviation: string
    displayName: string
    shortDisplayName: string
    color: string
    alternateColor: string
    logo: string
  }
  score?: string
}

export interface ESPNRosterResponse {
  athletes: ESPNAthleteGroup[]
  team: {
    id: string
    displayName: string
  }
}

export interface ESPNAthleteGroup {
  position: string
  items: ESPNAthlete[]
}

export interface ESPNAthlete {
  id: string
  uid: string
  guid: string
  firstName: string
  lastName: string
  fullName: string
  displayName: string
  shortName: string
  weight: number
  displayWeight: string
  height: number
  displayHeight: string
  age: number
  dateOfBirth: string
  birthPlace: {
    city?: string
    state?: string
    country?: string
  }
  college: {
    id: string
    mascot: string
    name: string
    shortName: string
    abbrev: string
  }
  slug: string
  jersey: string
  position: {
    id: string
    name: string
    displayName: string
    abbreviation: string
  }
  experience: {
    years: number
    displayValue: string
    abbreviation: string
  }
  status: {
    id: string
    name: string
    type: string
    abbreviation: string
  }
}
