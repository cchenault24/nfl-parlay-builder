export interface CurrentWeekResponse {
  week: number
}

export interface GamesResponse {
  gameId: string
  week: number
  startTime: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  home: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
  }
  venue: { name: string; city: string; state: string }
  weather?: { condition: string; temperatureF: number; windMph: number }
  leaders?: {
    passing?: { name: string; stats: string; value: number }
    rushing?: { name: string; stats: string; value: number }
    receiving?: { name: string; stats: string; value: number }
  }
}
