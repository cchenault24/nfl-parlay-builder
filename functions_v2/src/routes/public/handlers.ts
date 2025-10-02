import axios from 'axios'
import * as cheerio from 'cheerio'
import express from 'express'
import {
  fetchPFRDataForTeams,
  fetchPFRSeasonSchedule,
  fetchPFRTeamDataForGame,
} from '../../providers/pfr'
import { PFRGameItem } from '../../providers/pfr/types'
import { PFR_BASE, getPFRHeaders } from '../../providers/pfr/utils'
import { getCached, setCached } from '../../utils/cache'
import { errorResponse } from '../../utils/errors'
import { GamesResponse } from './schema'

// Extended request type with correlation ID
interface CorrelatedRequest extends express.Request {
  correlationId: string
}

const CACHE_TTL_MS = 10 * 60 * 1000

export const getPFRGameHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlatedReq = req as CorrelatedRequest
  const correlationId = correlatedReq.correlationId

  try {
    const { homeTeamCode, awayTeamCode, season, week } = req.query

    if (!homeTeamCode || !awayTeamCode || !season || !week) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'Missing required parameters: homeTeamCode, awayTeamCode, season, week',
        correlationId
      )
    }

    const seasonNum = parseInt(season as string)
    const weekNum = parseInt(week as string)

    if (
      !Number.isInteger(seasonNum) ||
      !Number.isInteger(weekNum) ||
      weekNum <= 0
    ) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'Invalid season or week',
        correlationId
      )
    }

    const teamData = await fetchPFRTeamDataForGame(
      homeTeamCode as string,
      awayTeamCode as string,
      seasonNum,
      weekNum
    )

    // Convert PFR data to GamesResponse format
    const gameResponse: GamesResponse = {
      gameId: `${homeTeamCode}-${awayTeamCode}-${season}-${week}`,
      week: weekNum,
      dateTime: new Date().toISOString(),
      status: 'scheduled',
      home: {
        teamId: homeTeamCode as string,
        name: teamData.home?.teamName || (homeTeamCode as string),
        abbrev: homeTeamCode as string,
        record: '0-0',
        overallRecord: '0-0',
        homeRecord: '0-0',
        roadRecord: '0-0',
        stats: teamData.home,
      },
      away: {
        teamId: awayTeamCode as string,
        name: teamData.away?.teamName || (awayTeamCode as string),
        abbrev: awayTeamCode as string,
        record: '0-0',
        overallRecord: '0-0',
        homeRecord: '0-0',
        roadRecord: '0-0',
        stats: teamData.away,
      },
      venue: { name: 'TBD', city: 'TBD', state: 'TBD' },
      leaders: {},
    }

    res.json([gameResponse])
  } catch (error) {
    console.error('PFR game handler error:', error)
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to fetch PFR game data',
      correlationId
    )
  }
}

export const getGamesHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlatedReq = req as CorrelatedRequest
  const correlationId = correlatedReq.correlationId
  const weekStr = req.query.week as string | undefined
  if (!weekStr) {
    return errorResponse(
      res,
      400,
      'validation_error',
      'Missing query param: week',
      correlationId
    )
  }
  const week = Number(weekStr)
  if (!Number.isInteger(week) || week <= 0) {
    return errorResponse(
      res,
      400,
      'validation_error',
      'Invalid week',
      correlationId
    )
  }
  try {
    const cacheKey = `games:pfr:week:${week}:withStats:v4`
    const cached = await getCached<GamesResponse[]>(cacheKey, CACHE_TTL_MS)
    if (cached) {
      return res.json(cached)
    }

    // For PFR, we need specific team codes to scrape
    // For now, return empty array - frontend will need to provide team codes
    const games: GamesResponse[] = []

    await setCached(cacheKey, games)
    res.json(games)
  } catch {
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to fetch games',
      correlationId
    )
  }
}

// New endpoint to fetch PFR data for frontend-selected teams
export const getPFRDataForTeamsHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlatedReq = req as CorrelatedRequest
  const correlationId = correlatedReq.correlationId

  try {
    const { teams, season, week } = req.body

    // Validate required parameters
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'Teams array is required',
        correlationId
      )
    }

    if (!season || !week) {
      return errorResponse(
        res,
        400,
        'validation_error',
        'Season and week are required',
        correlationId
      )
    }

    // Validate team structure
    for (const team of teams) {
      if (!team.teamId || !team.teamName) {
        return errorResponse(
          res,
          400,
          'validation_error',
          'Each team must have teamId and teamName',
          correlationId
        )
      }
    }

    // Fetch PFR data for all teams
    const teamData = await fetchPFRDataForTeams(
      teams,
      parseInt(season),
      parseInt(week)
    )

    res.json({
      success: true,
      message: `PFR data fetched for ${teams.length} teams`,
      season: parseInt(season),
      week: parseInt(week),
      teams: teamData,
    })
  } catch (error) {
    console.error('Error fetching PFR data for teams:', error)
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to fetch PFR data for teams',
      correlationId
    )
  }
}

// New endpoint to fetch entire NFL schedule from PFR
export const getPFRScheduleHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlatedReq = req as CorrelatedRequest
  const correlationId = correlatedReq.correlationId

  try {
    // Fetch entire season schedule from PFR in one call
    const allGames: PFRGameItem[] = await fetchPFRSeasonSchedule()

    // Convert PFRGameItem to the format expected by frontend
    const games = allGames.map(game => ({
      gameId: game.id,
      week: game.week,
      dateTime: game.dateTime,
      status: game.status,
      home: {
        teamId: game.homeTeam.id,
        name: game.homeTeam.name,
        abbrev: game.homeTeam.abbreviation,
        record: '0-0',
        overallRecord: '0-0',
        homeRecord: '0-0',
        roadRecord: '0-0',
        stats: null,
      },
      away: {
        teamId: game.awayTeam.id,
        name: game.awayTeam.name,
        abbrev: game.awayTeam.abbreviation,
        record: '0-0',
        overallRecord: '0-0',
        homeRecord: '0-0',
        roadRecord: '0-0',
        stats: null,
      },
      venue: { name: 'TBD', city: 'TBD', state: 'TBD' },
      leaders: {},
    }))

    res.json(games)
  } catch {
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to fetch NFL schedule',
      correlationId
    )
  }
}

export const getNFLWeeksHandler = async (
  req: express.Request,
  res: express.Response
) => {
  const correlatedReq = req as CorrelatedRequest
  const correlationId = correlatedReq.correlationId

  try {
    const season = parseInt(req.query.season as string) || 2025

    // Scrape PFR schedule
    const url = `${PFR_BASE}/years/${season}/games.htm`

    const response = await axios.get(url, {
      headers: getPFRHeaders(),
      decompress: true,
    })

    const $ = cheerio.load(response.data)
    const scheduleTable = $('table#games').first()

    if (scheduleTable.length === 0) {
      throw new Error('No games table found')
    }

    const weekSchedule: Record<
      number,
      Array<{
        day: string
        date: string
        time: string
        away: string
        home: string
      }>
    > = {}

    // Process each row in the schedule table
    scheduleTable.find('tbody tr').each((index, row) => {
      const $row = $(row)

      // Get week number from th element
      const weekCell = $row.find('th[data-stat="week_num"]').text().trim()
      const currentWeek = parseInt(weekCell, 10)

      // Skip if not a valid week number
      if (isNaN(currentWeek) || currentWeek < 1 || currentWeek > 18) {
        return
      }

      // Extract game data using the correct data-stat attributes
      const day = $row.find('td[data-stat="game_day_of_week"]').text().trim()
      const date = $row.find('td[data-stat="game_date"]').text().trim()
      const time = $row.find('td[data-stat="gametime"]').text().trim()
      const winnerCell = $row.find('td[data-stat="winner"]')
      const awayIndicator = $row.find('td[data-stat="game_location"]')
      const loserCell = $row.find('td[data-stat="loser"]')

      // Extract team names from links
      const winnerName = winnerCell.find('a').text().trim()
      const loserName = loserCell.find('a').text().trim()

      if (!winnerName || !loserName) {
        return
      }

      // Determine home/away teams based on @ symbol
      const isWinnerAway = awayIndicator.text().trim() === '@'

      let homeTeam: string
      let awayTeam: string

      if (isWinnerAway) {
        // Winner is away, loser is home
        awayTeam = winnerName
        homeTeam = loserName
      } else {
        // Winner is home, loser is away
        homeTeam = winnerName
        awayTeam = loserName
      }

      // Initialize week array if it doesn't exist
      if (!weekSchedule[currentWeek]) {
        weekSchedule[currentWeek] = []
      }

      // Add game to the week
      weekSchedule[currentWeek].push({
        day,
        date,
        time,
        away: awayTeam,
        home: homeTeam,
      })
    })

    res.json({
      success: true,
      message: 'NFL weeks retrieved successfully',
      season,
      data: weekSchedule,
    })
  } catch {
    return errorResponse(
      res,
      500,
      'internal_error',
      'Failed to get NFL weeks',
      correlationId
    )
  }
}
