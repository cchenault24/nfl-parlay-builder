export type StatsSource = 'pfr'

export function getStatsSource(): StatsSource {
  // Always use PFR as the stats provider
  return 'pfr'
}
