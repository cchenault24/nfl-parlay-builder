import { useEffect, useState } from 'react'
import { API_CONFIG } from '../config/api'

interface PFRTeamStats {
  offense: {
    pointsPerGame: number
    totalYards: number
    passingYards: number
    rushingYards: number
  }
  defense: {
    pointsAllowedPerGame: number
    totalYardsAllowed: number
    passingYardsAllowed: number
    rushingYardsAllowed: number
  }
}

interface PFRLeaders {
  passing?: {
    name: string
    stats: string
    value: number
  }
  rushing?: {
    name: string
    stats: string
    value: number
  }
  receiving?: {
    name: string
    stats: string
    value: number
  }
}

interface PFRTeam {
  teamId: string
  name: string
  abbrev: string
  record: string
  overallRecord: string
  homeRecord: string
  roadRecord: string
  stats: PFRTeamStats | null
}

interface PFRGame {
  gameId: string
  week: number
  dateTime: string
  status: 'final' | 'scheduled'
  home: PFRTeam
  away: PFRTeam
  venue: {
    name: string
    city: string
    state: string
  }
  leaders: PFRLeaders | null
}

interface UsePFRGamesResult {
  games: PFRGame[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export const usePFRGames = (
  week: number,
  season: number = 2025
): UsePFRGamesResult => {
  const [games, setGames] = useState<PFRGame[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGames = async () => {
    if (!week || !season) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const baseURL = API_CONFIG.CLOUD_FUNCTIONS.baseURL
      const response = await fetch(
        `${baseURL}/api/v2/pfr-games?week=${week}&season=${season}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setGames(data)
    } catch (err) {
      console.error('Error fetching PFR games:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch games')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [week, season])

  return {
    games,
    loading,
    error,
    refetch: fetchGames,
  }
}

export type { PFRGame }
