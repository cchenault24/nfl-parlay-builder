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
    // look for the current week (the week with games that are not all completed)
    // NFL weeks change on Tuesday at 3am EST
    for (const week of weeks) {
      const weekGames = allGames.filter(game => game.week === week)

      if (weekGames.length === 0) continue

      // Check if this week has any completed games (final status)
      const completedCount = weekGames.filter(
        game => game.status === 'final'
      ).length

      // If this week has games but not all are completed, it's the current week
      if (weekGames.length > 0 && completedCount < weekGames.length) {
        return week
      }
    }

    // If all weeks are completed, we're likely after the season
    // Return the highest week number
    const highestWeek = Math.max(...weeks)
    return highestWeek
  }, [allGames])

  return {
    currentWeek,
    isLoading,
    isError: !!error,
    error,
  }
}
