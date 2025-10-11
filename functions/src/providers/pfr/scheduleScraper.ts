import axios from 'axios'
import * as cheerio from 'cheerio'
import { getStadiumForTeamName } from './stadiumService'
import { PFRGameItem } from './types'
import { PFR_BASE, createNFLTeamFromPFRName, getPFRHeaders } from './utils'

/**
 * Format PFR date and time as a parseable date string
 * PFR format: date = "2025-09-04", time = "8:20PM" (12-hour Eastern Time)
 * Output: "2025-09-04T20:20:00" (parseable ISO string - PFR times are already in correct timezone)
 */
function formatPFRDateTime(date: string, time: string): string {
  try {
    // Validate input parameters
    if (!date || !time) {
      console.warn(
        `Missing date or time: date="${date}", time="${time}", using fallback`
      )
      return date || new Date().toISOString()
    }

    // Validate time format (12-hour with AM/PM, no space)
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
    if (!timeMatch) {
      console.warn(
        `Invalid time format: "${time}", expected format like "8:20PM" or "1:00PM"`
      )
      return date
    }

    const [, hours, minutes, period] = timeMatch
    const hour = parseInt(hours, 10)
    const minute = parseInt(minutes, 10)

    // Validate hour and minute ranges
    if (hour < 1 || hour > 12) {
      console.warn(`Invalid hour: ${hour}, must be 1-12`)
      return date
    }

    if (minute < 0 || minute > 59) {
      console.warn(`Invalid minutes: ${minute}, must be 0-59`)
      return date
    }

    // Convert to 24-hour format
    let hour24 = hour
    if (period.toUpperCase() === 'PM' && hour !== 12) {
      hour24 = hour + 12
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
      hour24 = 0
    }

    // Create a parseable ISO string - PFR times are already in Eastern Time
    // No timezone offset needed since PFR provides times in the correct timezone
    const isoString = `${date}T${hour24.toString().padStart(2, '0')}:${minutes}:00`

    // Validate the date can be parsed
    const testDate = new Date(isoString)
    if (isNaN(testDate.getTime())) {
      console.warn(`Invalid date created: ${isoString}`)
      return date
    }

    return isoString
  } catch (error) {
    console.warn(
      `Error formatting date/time: date="${date}", time="${time}"`,
      error
    )
    return date
  }
}

/**
 * Scrape the PFR schedule and extract game data for the entire season
 */
export async function fetchPFRSeasonSchedule(): Promise<PFRGameItem[]> {
  const url = `${PFR_BASE}/years/2025/games.htm`

  const response = await axios.get(url, { headers: getPFRHeaders() })
  const $ = cheerio.load(response.data)

  // Find the schedule table with id='games'
  const scheduleTable = $('table#games').first()

  if (scheduleTable.length === 0) {
    return []
  }

  const games: PFRGameItem[] = []
  const gameData: Array<{
    homeTeam: any
    awayTeam: any
    gameId: string
    gameDateTime: string
    currentWeek: number
    status: 'scheduled' | 'in_progress' | 'final' | 'postponed'
  }> = []

  // First pass: collect basic game data
  scheduleTable.find('tbody tr').each((index, row) => {
    const $row = $(row)
    const cells = $row.find('td')

    if (cells.length < 7) {
      return // Skip header rows or incomplete rows
    }

    // Get week number from the th element with data-stat="week_num"
    const weekCell = $row.find('th[data-stat="week_num"]').text().trim()
    const currentWeek = parseInt(weekCell, 10)

    // Skip rows without valid week numbers
    if (isNaN(currentWeek) || currentWeek < 1 || currentWeek > 18) {
      return
    }

    // Extract game data using data-stat attributes
    const date = $row.find('td[data-stat="game_date"]').text().trim()
    const time = $row.find('td[data-stat="gametime"]').text().trim()

    // Determine venue based on home team's stadium
    // We'll get the stadium info after determining home/away teams

    // Extract winner and loser information using data-stat attributes
    const winnerCell = $row.find('td[data-stat="winner"]')
    const loserCell = $row.find('td[data-stat="loser"]')
    const awayIndicator = $row.find('td[data-stat="game_location"]')

    // Extract team names from links within the cells
    const winnerName =
      winnerCell.find('a').text().trim() || winnerCell.text().trim()
    const loserName =
      loserCell.find('a').text().trim() || loserCell.text().trim()

    if (!winnerName || !loserName) {
      return
    }

    // Determine home/away teams
    // Look for @ symbol in the away indicator column to determine which team is away
    const isWinnerAway = awayIndicator.text().trim() === '@'

    let homeTeam, awayTeam

    if (isWinnerAway) {
      // Winner is away, loser is home
      homeTeam = createNFLTeamFromPFRName(loserName)
      awayTeam = createNFLTeamFromPFRName(winnerName)
    } else {
      // Winner is home, loser is away
      homeTeam = createNFLTeamFromPFRName(winnerName)
      awayTeam = createNFLTeamFromPFRName(loserName)
    }

    const gameId = `${homeTeam.id}-${awayTeam.id}-2025-${currentWeek}`
    const gameDateTime = formatPFRDateTime(date, time)

    // Determine game status based on current time and game time
    let status: 'scheduled' | 'in_progress' | 'final' | 'postponed' =
      'scheduled'

    try {
      const gameTime = new Date(gameDateTime)
      const now = new Date()

      // Add 3.5 hours to game time to account for typical NFL game duration
      const gameEndTime = new Date(gameTime.getTime() + 3.5 * 60 * 60 * 1000)

      if (now > gameEndTime) {
        // Game has likely finished (3.5+ hours after start time)
        status = 'final'
      } else if (now > gameTime) {
        // Game has started but not finished yet
        status = 'in_progress'
      } else {
        // Game hasn't started yet
        status = 'scheduled'
      }
    } catch (error) {
      console.warn(`Error determining status for game ${gameId}:`, error)
      // Default to scheduled if there's an error parsing the date
      status = 'scheduled'
    }

    gameData.push({
      homeTeam,
      awayTeam,
      gameId,
      gameDateTime,
      currentWeek,
      status,
    })
  })

  // Second pass: get venue information for each game
  for (const game of gameData) {
    let venue = { name: 'TBD', city: 'TBD', state: 'TBD' }
    try {
      const stadium = await getStadiumForTeamName(game.homeTeam.name)
      if (stadium) {
        venue = {
          name: stadium.name,
          city: stadium.city,
          state: stadium.state,
        }
      }
    } catch (error) {
      console.warn(`Failed to get stadium for ${game.homeTeam.name}:`, error)
    }

    games.push({
      id: game.gameId,
      dateTime: game.gameDateTime,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue,
      week: game.currentWeek,
      season: 2025,
      status: game.status,
    })
  }

  return games
}
