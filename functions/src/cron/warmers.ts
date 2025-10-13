// Firebase Functions v2 scheduler integration available for production deployment
// import { onSchedule } from 'firebase-functions/v2/scheduler'
import { log } from '../observability/logger'
import { oddsProvider } from '../providers/odds/client'
import { scheduleProvider } from '../providers/pfr/schedule'
import { teamStatsProvider } from '../providers/pfr/teamStats'
import { weatherProvider } from '../providers/weather/client'
import { getStadiumFromTeamCode } from '../utils/teamMapping'

// Popular NFL teams for warming
const POPULAR_TEAMS = [
  { teamId: 'KC', teamName: 'Kansas City Chiefs', pfrCode: 'KAN' },
  { teamId: 'BUF', teamName: 'Buffalo Bills', pfrCode: 'BUF' },
  { teamId: 'CIN', teamName: 'Cincinnati Bengals', pfrCode: 'CIN' },
  { teamId: 'MIA', teamName: 'Miami Dolphins', pfrCode: 'MIA' },
  { teamId: 'LAC', teamName: 'Los Angeles Chargers', pfrCode: 'LAC' },
  { teamId: 'BAL', teamName: 'Baltimore Ravens', pfrCode: 'BAL' },
  { teamId: 'JAX', teamName: 'Jacksonville Jaguars', pfrCode: 'JAX' },
  { teamId: 'PIT', teamName: 'Pittsburgh Steelers', pfrCode: 'PIT' },
  { teamId: 'CLE', teamName: 'Cleveland Browns', pfrCode: 'CLE' },
  { teamId: 'HOU', teamName: 'Houston Texans', pfrCode: 'HOU' },
  { teamId: 'IND', teamName: 'Indianapolis Colts', pfrCode: 'IND' },
  { teamId: 'TEN', teamName: 'Tennessee Titans', pfrCode: 'TEN' },
  { teamId: 'DEN', teamName: 'Denver Broncos', pfrCode: 'DEN' },
  { teamId: 'LV', teamName: 'Las Vegas Raiders', pfrCode: 'LVR' },
  { teamId: 'NYJ', teamName: 'New York Jets', pfrCode: 'NYJ' },
  { teamId: 'NE', teamName: 'New England Patriots', pfrCode: 'NWE' },
]

// Generate popular stadiums from popular teams
const POPULAR_STADIUMS = POPULAR_TEAMS.map(team => {
  const stadiumInfo = getStadiumFromTeamCode(team.teamId)
  return (
    stadiumInfo || {
      stadium: 'Unknown Stadium',
      city: 'Unknown City',
      state: 'XX',
    }
  )
})

/**
 * Warm current week schedule every hour
 * This function can be called by a cron job or scheduled task
 */
export async function warmCurrentWeekSchedule() {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()

    // Calculate current week using simplified NFL season logic
    const weekStart = new Date(currentYear, 0, 1)
    const daysSinceStart = Math.floor(
      (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const currentWeek = Math.min(
      Math.max(Math.floor(daysSinceStart / 7) + 1, 1),
      18
    )

    log.info('warmer.schedule.start', { currentYear, currentWeek })

    await scheduleProvider.warmCurrentWeek(currentYear, currentWeek)

    log.info('warmer.schedule.success', { currentYear, currentWeek })
  } catch (error) {
    log.error('warmer.schedule.error', {
      error: {
        code: 'schedule_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
// )

/**
 * Warm popular team stats every 30 minutes
 * This function can be called by a cron job or scheduled task
 */
export async function warmPopularTeamStats() {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()

    // Calculate current week using simplified NFL season logic
    const weekStart = new Date(currentYear, 0, 1)
    const daysSinceStart = Math.floor(
      (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const currentWeek = Math.min(
      Math.max(Math.floor(daysSinceStart / 7) + 1, 1),
      18
    )

    log.info('warmer.team_stats.start', {
      currentYear,
      currentWeek,
      teamCount: POPULAR_TEAMS.length,
    })

    await teamStatsProvider.warmPopularTeams(
      POPULAR_TEAMS,
      currentYear,
      currentWeek
    )

    log.info('warmer.team_stats.success', {
      currentYear,
      currentWeek,
      teamCount: POPULAR_TEAMS.length,
    })
  } catch (error) {
    log.error('warmer.team_stats.error', {
      error: {
        code: 'team_stats_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
// )

/**
 * Warm weather data for popular stadiums every 15 minutes
 * This function can be called by a cron job or scheduled task
 */
export async function warmWeatherData() {
  try {
    log.info('warmer.weather.start', { stadiumCount: POPULAR_STADIUMS.length })

    const warmPromises = POPULAR_STADIUMS.map(async stadium => {
      try {
        const request = {
          gameId: `warm_${stadium.stadium.replace(/\s+/g, '_').toLowerCase()}`,
          stadium: stadium.stadium,
          city: stadium.city,
          state: stadium.state,
          gameTime: new Date().toISOString(),
        }

        await weatherProvider.getWeather(request)
      } catch (error) {
        log.warn('warmer.weather.stadium.failed', {
          stadium: stadium.stadium,
          error: {
            code: 'stadium_error',
            message: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    await Promise.allSettled(warmPromises)

    log.info('warmer.weather.success', {
      stadiumCount: POPULAR_STADIUMS.length,
    })
  } catch (error) {
    log.error('warmer.weather.error', {
      error: {
        code: 'weather_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
// )

/**
 * Warm odds data for popular matchups every 5 minutes
 * This function can be called by a cron job or scheduled task
 */
export async function warmOddsData() {
  try {
    log.info('warmer.odds.start', { matchupCount: POPULAR_TEAMS.length / 2 })

    // Create popular matchups for cache warming
    const matchups = []
    for (let i = 0; i < POPULAR_TEAMS.length; i += 2) {
      if (i + 1 < POPULAR_TEAMS.length) {
        matchups.push({
          homeTeam: POPULAR_TEAMS[i].teamName,
          awayTeam: POPULAR_TEAMS[i + 1].teamName,
        })
      }
    }

    const warmPromises = matchups.map(async matchup => {
      try {
        const request = {
          gameId: `warm_${matchup.homeTeam.replace(/\s+/g, '_').toLowerCase()}_vs_${matchup.awayTeam.replace(/\s+/g, '_').toLowerCase()}`,
          homeTeam: matchup.homeTeam,
          awayTeam: matchup.awayTeam,
          gameTime: new Date().toISOString(),
        }

        await oddsProvider.getOdds(request)
      } catch (error) {
        log.warn('warmer.odds.matchup.failed', {
          homeTeam: matchup.homeTeam,
          awayTeam: matchup.awayTeam,
          error: {
            code: 'matchup_error',
            message: error instanceof Error ? error.message : String(error),
          },
        })
      }
    })

    await Promise.allSettled(warmPromises)

    log.info('warmer.odds.success', { matchupCount: matchups.length })
  } catch (error) {
    log.error('warmer.odds.error', {
      error: {
        code: 'odds_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
// )
