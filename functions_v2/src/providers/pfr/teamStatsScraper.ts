import axios from 'axios'
import * as cheerio from 'cheerio'
import { PFRTeamData, PFRTeamInput, PFRTeamStats } from './types'
import { PFR_BASE, getPFRCodeFromTeamName, getPFRHeaders } from './utils'

/**
 * Scrape team statistics from Pro-Football-Reference for a specific game
 */
export async function fetchPFRTeamDataForGame(
  homeTeamCode: string,
  awayTeamCode: string,
  season: number,
  week: number
): Promise<PFRTeamData> {
  try {
    const [homeData, awayData] = await Promise.all([
      scrapeTeamStatsFromPFR(
        homeTeamCode,
        getTeamNameFromCode(homeTeamCode),
        season,
        week
      ),
      scrapeTeamStatsFromPFR(
        awayTeamCode,
        getTeamNameFromCode(awayTeamCode),
        season,
        week
      ),
    ])

    return {
      home: homeData,
      away: awayData,
    }
  } catch (error) {
    console.error('Error fetching PFR team data:', error)
    return { home: null, away: null }
  }
}

/**
 * Fetch PFR data for multiple teams
 */
export async function fetchPFRDataForTeams(
  teams: PFRTeamInput[],
  season: number,
  week: number
): Promise<{ [teamId: string]: PFRTeamStats | null }> {
  const results: { [teamId: string]: PFRTeamStats | null } = {}

  // Process teams in parallel
  const teamPromises = teams.map(async team => {
    try {
      // Try to determine PFR code from team name or use provided code
      const pfrCode = team.pfrCode || getPFRCodeFromTeamName(team.teamName)

      if (!pfrCode) {
        return { teamId: team.teamId, data: null }
      }
      const teamData = await scrapeTeamStatsFromPFR(
        pfrCode,
        team.teamName,
        season,
        week
      )

      return { teamId: team.teamId, data: teamData }
    } catch (error) {
      console.error(`Error fetching data for team ${team.teamName}:`, error)
      return { teamId: team.teamId, data: null }
    }
  })

  const teamResults = await Promise.all(teamPromises)

  // Convert results to the expected format
  teamResults.forEach(({ teamId, data }) => {
    results[teamId] = data
  })

  return results
}

/**
 * Core function to scrape team stats from PFR
 */
async function scrapeTeamStatsFromPFR(
  teamCode: string,
  teamName: string,
  season: number,
  week: number
): Promise<PFRTeamStats | null> {
  const url = `${PFR_BASE}/teams/${teamCode}/${season}.htm`

  const response = await axios.get(url, { headers: getPFRHeaders() })
  const $ = cheerio.load(response.data)

  // Find the team stats table
  const statsTable = $(
    'table#team_stats, table#team_and_defense, table[id*="team_stats"]'
  ).first()

  if (statsTable.length === 0) {
    return null
  }

  // Extract team stats from the table
  const teamRow = statsTable
    .find('tr')
    .filter((i, row) => {
      return $(row).find('th').text().trim() === 'Team Stats'
    })
    .first()

  if (teamRow.length === 0) {
    return null
  }

  // Find the ranking rows - look for league-wide rankings
  const teamStatsTable = $(
    'table#team_stats, table#team_and_defense, table[id*="team_stats"]'
  ).first()

  let offenseRankRow = $()
  let defenseRankRow = $()

  if (teamStatsTable.length > 0) {
    // Look for offensive rankings row
    offenseRankRow = teamStatsTable
      .find('tr')
      .filter((i, row) => {
        const text = $(row).find('th').text().trim().toLowerCase()
        return text.includes('offense') || text.includes('offensive')
      })
      .first()

    // Look for defensive rankings row
    defenseRankRow = teamStatsTable
      .find('tr')
      .filter((i, row) => {
        const text = $(row).find('th').text().trim().toLowerCase()
        return text.includes('defense') || text.includes('defensive')
      })
      .first()
  }

  // Helper function to get rank value from a row
  const getRankValue = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: cheerio.Cheerio<any>,
    cellIndex: number
  ): number => {
    if (row.length === 0) {
      return 0
    }
    const cells = row.find('td')
    if (cells.length <= cellIndex) {
      return 0
    }
    const cellText = $(cells[cellIndex]).text().trim()
    const rank = parseInt(cellText, 10)
    return isNaN(rank) ? 0 : rank
  }

  // If we found ranking rows, use them; otherwise use the team row
  if (offenseRankRow.length === 0) {
    offenseRankRow = teamRow
  }
  if (defenseRankRow.length === 0) {
    defenseRankRow = teamRow
  }

  // Extract team record from the games table
  const gamesTable = $('table#games').first()
  let teamRecord = '0-0'
  let overallRecord = '0-0'
  let homeRecord = '0-0'
  let roadRecord = '0-0'

  if (gamesTable.length > 0) {
    const gameRows = gamesTable.find('tbody tr')
    let latestRecord = '0-0'
    let homeWins = 0
    let homeLosses = 0
    let roadWins = 0
    let roadLosses = 0

    gameRows.each((i, row) => {
      const $row = $(row)

      // Get the team record for this game
      const recordCell = $row.find('td[data-stat="team_record"]')
      if (recordCell.length > 0) {
        const record = recordCell.text().trim()
        if (record && record !== '') {
          latestRecord = record
        }
      }

      // Determine if this was a home or away game
      const gameLocation = $row
        .find('td[data-stat="game_location"]')
        .text()
        .trim()
      const isHomeGame = gameLocation === '' || (gameLocation === '@') === false

      // Determine if this was a win or loss
      const result = $row.find('td[data-stat="game_result"]').text().trim()
      const isWin = result === 'W'
      const isLoss = result === 'L'

      // Skip if it's not a completed game (no result)
      if (!isWin && !isLoss) {
        return
      }

      // Update home/road records
      if (isHomeGame) {
        if (isWin) homeWins++
        if (isLoss) homeLosses++
      } else {
        if (isWin) roadWins++
        if (isLoss) roadLosses++
      }
    })

    teamRecord = latestRecord
    overallRecord = latestRecord
    homeRecord = `${homeWins}-${homeLosses}`
    roadRecord = `${roadWins}-${roadLosses}`
  }

  const teamStatsData: PFRTeamStats = {
    teamId: teamCode, // Use PFR code as team ID
    teamName,
    season,
    week,
    record: teamRecord,
    overallRecord: overallRecord,
    homeRecord: homeRecord,
    roadRecord: roadRecord,
    // Core offensive rankings - only what's needed for AI
    offenseRankings: {
      totalYardsRank: getRankValue(offenseRankRow, 1), // Total yards rank (Cell 1)
      passingYardsRank: getRankValue(offenseRankRow, 9), // Passing yards rank (Cell 9)
      rushingYardsRank: getRankValue(offenseRankRow, 15), // Rushing yards rank (Cell 15)
      pointsScoredRank: getRankValue(offenseRankRow, 0), // Points rank (Cell 0)
    },
    // Core defensive rankings - only what's needed for AI
    defenseRankings: {
      totalYardsAllowedRank: getRankValue(defenseRankRow, 1), // Total yards allowed rank (Cell 1)
      pointsAllowedRank: getRankValue(defenseRankRow, 0), // Points allowed rank (Cell 0)
      turnoversRank: getRankValue(defenseRankRow, 4), // Turnovers rank (Cell 4)
    },
    // Overall ranks will be calculated below
    overallOffenseRank: 0,
    overallDefenseRank: 0,
    overallTeamRank: 0,
    specialTeamsRank: 16,
  }

  // Calculate overall rankings from individual stat rankings
  const offensiveRanks = [
    teamStatsData.offenseRankings.totalYardsRank,
    teamStatsData.offenseRankings.passingYardsRank,
    teamStatsData.offenseRankings.rushingYardsRank,
    teamStatsData.offenseRankings.pointsScoredRank,
  ].filter(rank => rank > 0) // Only include valid ranks

  const defensiveRanks = [
    teamStatsData.defenseRankings.totalYardsAllowedRank,
    teamStatsData.defenseRankings.pointsAllowedRank,
    teamStatsData.defenseRankings.turnoversRank,
  ].filter(rank => rank > 0) // Only include valid ranks

  // Calculate overall ranks
  teamStatsData.overallOffenseRank =
    offensiveRanks.length > 0
      ? Math.round(
          offensiveRanks.reduce((sum, rank) => sum + rank, 0) /
            offensiveRanks.length
        )
      : 0

  teamStatsData.overallDefenseRank =
    defensiveRanks.length > 0
      ? Math.round(
          defensiveRanks.reduce((sum, rank) => sum + rank, 0) /
            defensiveRanks.length
        )
      : 0

  teamStatsData.overallTeamRank = Math.round(
    (teamStatsData.overallOffenseRank + teamStatsData.overallDefenseRank) / 2
  )

  return teamStatsData
}

/**
 * Helper function to get team name from PFR code
 */
function getTeamNameFromCode(code: string): string {
  const codeToName: { [key: string]: string } = {
    dal: 'Dallas Cowboys',
    sfo: 'San Francisco 49ers',
    kan: 'Kansas City Chiefs',
    buf: 'Buffalo Bills',
    mia: 'Miami Dolphins',
    nwe: 'New England Patriots',
    nyj: 'New York Jets',
    rav: 'Baltimore Ravens',
    cin: 'Cincinnati Bengals',
    cle: 'Cleveland Browns',
    pit: 'Pittsburgh Steelers',
    htx: 'Houston Texans',
    clt: 'Indianapolis Colts',
    jax: 'Jacksonville Jaguars',
    oti: 'Tennessee Titans',
    den: 'Denver Broncos',
    rai: 'Las Vegas Raiders',
    sdg: 'Los Angeles Chargers',
    crd: 'Arizona Cardinals',
    ram: 'Los Angeles Rams',
    sea: 'Seattle Seahawks',
    atl: 'Atlanta Falcons',
    car: 'Carolina Panthers',
    nor: 'New Orleans Saints',
    tam: 'Tampa Bay Buccaneers',
    chi: 'Chicago Bears',
    det: 'Detroit Lions',
    gnb: 'Green Bay Packers',
    min: 'Minnesota Vikings',
    nyg: 'New York Giants',
    phi: 'Philadelphia Eagles',
    was: 'Washington Commanders',
  }

  return codeToName[code] || code
}
