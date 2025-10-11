// Main PFR provider - re-exports from focused modules
export {
  fetchPFRDataForTeams,
  fetchPFRTeamDataForGame,
} from './teamStatsScraper'

export { getPFRCodeFromTeamName } from './utils'

export { fetchPFRSeasonSchedule } from './scheduleScraper'
export { getPFRHeaders } from './utils'

// Stadium functionality
export {
  createTeamStadiumMapping,
  fetchPFRStadiums,
  getStadiumForTeam,
} from './stadiumScraper'
export {
  clearStadiumCache,
  getStadiumData,
  getStadiumForTeamName,
  getTeamStadiumMapping,
} from './stadiumService'

// Re-export types for convenience
export type {
  PFRGameItem,
  PFRScrapingResult,
  PFRStadium,
  PFRTeamData,
  PFRTeamInput,
  PFRTeamStats,
} from './types'
