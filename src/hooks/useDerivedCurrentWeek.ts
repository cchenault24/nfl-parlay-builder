import { useMemo } from 'react'
import type { Game } from '../types'
import { useSchedule } from './useSchedule'

const DAY_MS = 24 * 60 * 60 * 1000

// The current week is the first one that still has an unplayed game; once the
// season is over it stays on the last week.
export function deriveCurrentWeek(games: Game[], now = new Date()): number {
  if (games.length === 0) {
    return 1
  }
  const weeks = Array.from(new Set(games.map(g => g.week))).sort((a, b) => a - b)
  for (const week of weeks) {
    const weekGames = games.filter(g => g.week === week)
    const lastKickoff = Math.max(...weekGames.map(g => Date.parse(g.dateTime)))
    const hasUnplayed = weekGames.some(g => g.status !== 'final')
    if (hasUnplayed && now.getTime() <= lastKickoff + DAY_MS) {
      return week
    }
  }
  return weeks[weeks.length - 1]
}

export const useDerivedCurrentWeek = () => {
  const { data: games, isLoading, error } = useSchedule()
  const currentWeek = useMemo(() => deriveCurrentWeek(games ?? []), [games])
  return { currentWeek, isLoading, error }
}
