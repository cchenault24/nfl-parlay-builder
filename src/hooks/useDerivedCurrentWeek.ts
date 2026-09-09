import { useMemo } from 'react'
import type { WeekSummary } from '../types'
import { useSeasonSummary } from './useSeason'

const DAY_MS = 24 * 60 * 60 * 1000

// The current week is the first one that still has an unplayed game; once the
// season is over it stays on the last week. `weeks` is expected pre-sorted
// ascending (the /season endpoint already sorts it).
export function deriveCurrentWeek(weeks: WeekSummary[], now = new Date()): number {
  if (weeks.length === 0) {
    return 1
  }
  for (const w of weeks) {
    if (!w.allFinal && now.getTime() <= Date.parse(w.lastKickoff) + DAY_MS) {
      return w.week
    }
  }
  return weeks[weeks.length - 1].week
}

export const useDerivedCurrentWeek = () => {
  const { data, isLoading, error } = useSeasonSummary()
  const currentWeek = useMemo(() => deriveCurrentWeek(data?.weeks ?? []), [data])
  return { currentWeek, isLoading, error }
}
