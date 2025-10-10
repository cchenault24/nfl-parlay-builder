import { getCached, setCached } from '../../utils/cache'
import {
  PFRStadium,
  createTeamStadiumMapping,
  getStadiumForTeam,
} from './stadiumScraper'

const STADIUM_CACHE_KEY = 'pfr_stadiums'
const STADIUM_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

let stadiumCache: PFRStadium[] | null = null
let teamStadiumMap: Map<string, PFRStadium> | null = null

/**
 * Get stadium data with caching
 */
export async function getStadiumData(): Promise<PFRStadium[]> {
  if (stadiumCache) {
    return stadiumCache
  }

  // Try to get from cache first
  const cached = await getCached<PFRStadium[]>(
    STADIUM_CACHE_KEY,
    STADIUM_CACHE_TTL
  )
  if (cached) {
    stadiumCache = cached
    return stadiumCache
  }

  // If not in cache, fetch from PFR
  const { fetchPFRStadiums } = await import('./stadiumScraper')
  const stadiums = await fetchPFRStadiums()

  // Cache the results
  await setCached(STADIUM_CACHE_KEY, stadiums)
  stadiumCache = stadiums

  return stadiums
}

/**
 * Get team-to-stadium mapping with caching
 */
export async function getTeamStadiumMapping(): Promise<
  Map<string, PFRStadium>
> {
  if (teamStadiumMap) {
    return teamStadiumMap
  }

  const stadiums = await getStadiumData()
  teamStadiumMap = createTeamStadiumMapping(stadiums)

  return teamStadiumMap
}

/**
 * Get stadium for a specific team
 */
export async function getStadiumForTeamName(
  teamName: string
): Promise<PFRStadium | null> {
  const mapping = await getTeamStadiumMapping()
  return getStadiumForTeam(teamName, mapping)
}

/**
 * Clear stadium cache (useful for testing or forced refresh)
 */
export function clearStadiumCache(): void {
  stadiumCache = null
  teamStadiumMap = null
}
