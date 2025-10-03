import { useMemo } from 'react'
import { usePFRSchedule } from './usePFRSchedule'

/**
 * Derives the current NFL week from PFR game data
 * Uses the logic: current week = the week that contains the current date
 * Falls back to the highest week with non-final games if date-based detection fails
 */
export const useDerivedCurrentWeek = () => {
  const { data: allGames, isLoading, error } = usePFRSchedule()

  const currentWeek = useMemo(() => {
    if (!allGames || allGames.length === 0) {
      return 1 // Default fallback
    }

    const now = new Date()

    // Get all unique weeks from the games
    const weeks = Array.from(new Set(allGames.map(game => game.week))).sort(
      (a, b) => a - b
    )

    // Find the current week by looking for the week that contains the current date
    // We'll look for the week where the current date falls between the earliest and latest game times
    for (const week of weeks) {
      const weekGames = allGames.filter(game => game.week === week)

      if (weekGames.length === 0) {
        continue
      }

      // Get the date range for this week
      const gameDates = weekGames
        .map(game => new Date(game.dateTime))
        .sort((a, b) => a.getTime() - b.getTime())
      const weekStart = gameDates[0]
      const weekEnd = gameDates[gameDates.length - 1]

      // Add a small buffer to the end of the week (1 day) to account for games that might be on different days
      const weekEndWithBuffer = new Date(
        weekEnd.getTime() + 1 * 24 * 60 * 60 * 1000
      )

      // Check if current date falls within this week's range
      // A week is considered "current" if we're on or after the week start
      if (now >= weekStart && now <= weekEndWithBuffer) {
        return week
      }

      // Also consider it current if we're on the same day as the week start
      // (even if before the first game time)
      const weekStartDate = new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate()
      )
      const currentDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      )
      if (currentDate.getTime() === weekStartDate.getTime()) {
        return week
      }
    }

    // If we don't find a week that contains the current date,
    // return the week with the most recent games that are not final
    for (let i = weeks.length - 1; i >= 0; i--) {
      const week = weeks[i]
      const weekGames = allGames.filter(game => game.week === week)

      // If any game in this week is not final, this is likely the current week
      if (weekGames.some(game => game.status !== 'final')) {
        return week
      }
    }

    // Fallback: return the highest week
    return weeks[weeks.length - 1] || 1
  }, [allGames])

  return {
    currentWeek,
    isLoading,
    isError: !!error,
    error,
  }
}
