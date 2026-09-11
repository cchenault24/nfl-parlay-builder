import express from 'express'
import { log } from '../../observability/logger'
import type { TeamStats } from '../../providers/espn/types'
import { getGame, getSeasonSchedule, getTeamStats } from '../../providers/espn/client'
import { getWeekOdds } from '../../providers/odds/client'
import { errorResponse } from '../../utils/errors'
import { REGULAR_SEASON_WEEKS, getCurrentSeason } from '../../utils/season'

type CorrelatedRequest = express.Request & { correlationId: string }

export interface WeekSummary {
  week: number
  lastKickoff: string
  allFinal: boolean
}

export interface SeasonSummary {
  season: number
  weeks: WeekSummary[]
}

// A per-week summary, not the full ~270-game schedule — this is all the
// week picker and "what's the current week" logic need, at a fraction of
// the payload size.
export const getSeasonSummaryHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const { correlationId } = req as CorrelatedRequest
  try {
    const season = getCurrentSeason()
    const games = await getSeasonSchedule(season)
    const byWeek = new Map<number, typeof games>()
    for (const game of games) {
      const list = byWeek.get(game.week) ?? []
      list.push(game)
      byWeek.set(game.week, list)
    }
    const weeks: WeekSummary[] = Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, weekGames]) => ({
        week,
        lastKickoff: weekGames.reduce(
          (latest, g) => (g.dateTime > latest ? g.dateTime : latest),
          weekGames[0].dateTime
        ),
        allFinal: weekGames.every(g => g.status === 'final'),
      }))
    const summary: SeasonSummary = { season, weeks }
    res.json(summary)
  } catch (error) {
    log.error('api.season.error', {
      correlationId,
      error: {
        code: 'schedule_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
    return errorResponse(
      res,
      502,
      'schedule_unavailable',
      'Failed to fetch NFL schedule',
      correlationId
    )
  }
}

export const getGamesForWeekHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const { correlationId } = req as CorrelatedRequest
  const week = Number(req.query.week)
  if (!Number.isInteger(week) || week < 1 || week > REGULAR_SEASON_WEEKS) {
    return errorResponse(
      res,
      400,
      'validation_error',
      `week must be an integer 1-${REGULAR_SEASON_WEEKS}`,
      correlationId
    )
  }
  try {
    const games = await getSeasonSchedule(getCurrentSeason())
    res.json(games.filter(g => g.week === week))
  } catch (error) {
    log.error('api.games.error', {
      correlationId,
      week,
      error: {
        code: 'schedule_error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
    return errorResponse(
      res,
      502,
      'schedule_unavailable',
      'Failed to fetch games for week',
      correlationId
    )
  }
}

// Per-book lines for every game in a week, including the books that have posted
// nothing. Two things in the redesign need it, and neither can wait for a run
// to finish: the book-lines panel on game detail, and disabling a sportsbook a
// Pro user cannot actually price this game against.
//
// It costs no extra Odds API credits. The provider fetches the whole NFL slate
// in a single request and caches it, so this is a read of a response the app
// was already paying for.
export const getWeekOddsHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const { correlationId } = req as CorrelatedRequest
  const week = Number(req.params.week)
  if (!Number.isInteger(week) || week < 1 || week > REGULAR_SEASON_WEEKS) {
    return errorResponse(
      res,
      400,
      'validation_error',
      `week must be an integer 1-${REGULAR_SEASON_WEEKS}`,
      correlationId
    )
  }
  try {
    const schedule = await getSeasonSchedule(getCurrentSeason())
    res.json(await getWeekOdds(schedule.filter(g => g.week === week)))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('api.odds.week.error', {
      correlationId,
      week,
      error: { code: 'odds_unavailable', message },
    })
    return errorResponse(
      res,
      502,
      'odds_unavailable',
      'Failed to fetch book lines for this week',
      correlationId
    )
  }
}

export interface GameTeamStats {
  home: TeamStats | null
  away: TeamStats | null
}

// Both teams' season stats for one game, before any run has happened.
//
// The game-detail screen is the whole reason the redesign helps a free user:
// matchup rankings, book lines, venue and forecast cost no quota, so deciding
// which game to spend a generation on is cheap. None of that works if the
// rankings only appear *after* the generation is spent.
//
// Two cached ESPN reads per game opened, and `getTeamStats` caches per team, so
// a whole week of games costs 32 reads however many times they are opened.
export const getGameStatsHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const { correlationId } = req as CorrelatedRequest
  const gameId = String(req.params.gameId ?? '').trim()
  if (!gameId) {
    return errorResponse(
      res,
      400,
      'validation_error',
      'gameId is required',
      correlationId
    )
  }
  try {
    const game = await getGame(getCurrentSeason(), gameId)
    if (!game) {
      return errorResponse(res, 404, 'not_found', 'Game not found', correlationId)
    }
    // One team's stats being unavailable must not blank the other's — the
    // screen renders a dash for a missing rank and stays useful.
    const [home, away] = await Promise.all([
      getTeamStats(game.home.teamId, game.season).catch(() => null),
      getTeamStats(game.away.teamId, game.season).catch(() => null),
    ])
    const stats: GameTeamStats = { home, away }
    res.json(stats)
  } catch (error) {
    log.error('api.game.stats.error', {
      correlationId,
      gameId,
      error: {
        code: 'stats_unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
    })
    return errorResponse(
      res,
      502,
      'stats_unavailable',
      'Failed to fetch team statistics for this game',
      correlationId
    )
  }
}
