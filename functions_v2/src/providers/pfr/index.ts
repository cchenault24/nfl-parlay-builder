// Main PFR provider - re-exports from focused modules
export {
  fetchPFRDataForTeams,
  fetchPFRTeamDataForGame,
} from './teamStatsScraper'

export { getPFRCodeFromTeamName } from './utils'

export { fetchPFRSeasonSchedule } from './scheduleScraper'
export { getPFRHeaders } from './utils'

// Re-export types for convenience
export type {
  PFRGameItem,
  PFRScrapingResult,
  PFRTeamData,
  PFRTeamInput,
  PFRTeamStats,
} from './types'
