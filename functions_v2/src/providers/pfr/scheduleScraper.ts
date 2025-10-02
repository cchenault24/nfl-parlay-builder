import axios from 'axios'
import * as cheerio from 'cheerio'
import { PFRGameItem } from './types'
import { PFR_BASE, createNFLTeamFromPFRName, getPFRHeaders } from './utils'

/**
 * Convert PFR date and time format to ISO string
 * PFR format: date = "2026-01-04", time = "1:00PM"
 * Output: "2026-01-04T13:00:00.000Z"
 */
function formatPFRDateTime(date: string, time: string): string {
  try {
    // Parse the time to convert from 12-hour to 24-hour format
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
    if (!timeMatch) {
      console.warn(`Invalid time format: ${time}, using 12:00 PM as default`)
      return `${date}T12:00:00.000Z`
    }

    const [, hours, minutes, period] = timeMatch
    let hour24 = parseInt(hours, 10)

    if (period.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0
    }

    // Format as ISO string
    const isoString = `${date}T${hour24.toString().padStart(2, '0')}:${minutes}:00.000Z`

    // Validate the date
    const testDate = new Date(isoString)
    if (isNaN(testDate.getTime())) {
      console.warn(`Invalid date created: ${isoString}, using fallback`)
      return `${date}T12:00:00.000Z`
    }

    return isoString
  } catch (error) {
    console.warn(`Error formatting date/time: ${date} ${time}`, error)
    return `${date}T12:00:00.000Z`
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

  // Process each row in the tbody of the schedule table
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

    const gameId = `${awayTeam.id}-${homeTeam.id}-2025-${currentWeek}`
    const gameDateTime = formatPFRDateTime(date, time)
    const gameDate = new Date(gameDateTime)
    const now = new Date()

    // Determine game status based on current date
    let status: 'scheduled' | 'in_progress' | 'final' | 'postponed' =
      'scheduled'

    // If the game date is in the past, mark it as final
    // We'll add a buffer of 4 hours to account for game duration
    const gameEndTime = new Date(gameDate.getTime() + 4 * 60 * 60 * 1000)

    if (now > gameEndTime) {
      status = 'final'
    } else if (now >= gameDate) {
      // Game is currently in progress or just started
      status = 'in_progress'
    }

    games.push({
      id: gameId,
      dateTime: gameDateTime,
      homeTeam,
      awayTeam,
      week: currentWeek,
      season: 2025,
      status,
    })
  })

  return games
}
