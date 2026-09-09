// The NFL season is named for the year it kicks off; the schedule is
// published in May, so from March onward "current season" means this year.
export function getSeasonForDate(date: Date): number {
  return date.getMonth() >= 2 ? date.getFullYear() : date.getFullYear() - 1
}

export function getCurrentSeason(now: Date = new Date()): number {
  return getSeasonForDate(now)
}

export function getPreviousSeason(now: Date = new Date()): number {
  return getCurrentSeason(now) - 1
}

export const REGULAR_SEASON_WEEKS = 18
