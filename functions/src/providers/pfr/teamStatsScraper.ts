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

  // For individual team pages, we need to look at multiple tables
  const teamStatsTable = $('table#team_stats').first()

  if (teamStatsTable.length === 0) {
    console.log(`No team stats table found for ${teamCode}`)
    return null
  }

  // Get the rushing and receiving table for per-game averages
  const rushingReceivingTable = $('table#rushing_and_receiving').first()

  // The team stats table contains overall stats and rankings
  // The rushing and receiving table contains per-game averages
  const offenseTable = teamStatsTable
  const defenseTable = teamStatsTable

  // Find the specific rows in the team stats table by looking for the text content
  const offenseTeamRow = offenseTable
    .find('tr')
    .filter((i, row) => {
      const $row = $(row)
      const firstCell = $row.find('th, td').first().text().trim()
      return firstCell === 'Team Stats'
    })
    .first()

  const defenseTeamRow = offenseTable
    .find('tr')
    .filter((i, row) => {
      const $row = $(row)
      const firstCell = $row.find('th, td').first().text().trim()
      return firstCell === 'Opp. Stats'
    })
    .first()

  const offenseRankRow = offenseTable
    .find('tr')
    .filter((i, row) => {
      const $row = $(row)
      const firstCell = $row.find('th, td').first().text().trim()
      return firstCell === 'Lg Rank Offense'
    })
    .first()

  const defenseRankRow = offenseTable
    .find('tr')
    .filter((i, row) => {
      const $row = $(row)
      const firstCell = $row.find('th, td').first().text().trim()
      return firstCell === 'Lg Rank Defense'
    })
    .first()

  if (offenseTeamRow.length === 0 || defenseTeamRow.length === 0) {
    console.log(`Missing required data rows for ${teamCode}`)
    return null
  }

  // Helper to parse numeric cell value (can include commas)
  const getNumberValue = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: cheerio.Cheerio<any>,
    cellIndex: number
  ): number | undefined => {
    if (row.length === 0) {
      return undefined
    }
    const cells = row.find('td, th')
    if (cells.length <= cellIndex) {
      return undefined
    }
    const raw = $(cells[cellIndex]).text().trim().replace(/,/g, '')
    const num = parseFloat(raw)
    return isNaN(num) ? undefined : num
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
        if (isWin) {
          homeWins++
        }
        if (isLoss) {
          homeLosses++
        }
      } else {
        if (isWin) {
          roadWins++
        }
        if (isLoss) {
          roadLosses++
        }
      }
    })

    teamRecord = latestRecord
    overallRecord = latestRecord
    homeRecord = `${homeWins}-${homeLosses}`
    roadRecord = `${roadWins}-${roadLosses}`
  }

  // Extract offense values from Team Stats row (Row 2)
  // Based on the table structure: Player, PF, Yds, Ply, Y/P, TO, FL, 1stD, Cmp, Att, Yds, TD, Int, NY/A, 1stD, Att, Yds, TD, Y/A, 1stD, Pen, Yds, 1stPy, #Dr, Sc%, TO%, Start, Time, Plays, Yds, Pts
  const teamPoints = getNumberValue(offenseTeamRow, 1) // PF column
  const teamYards = getNumberValue(offenseTeamRow, 2) // Yds column
  const teamPassYards = getNumberValue(offenseTeamRow, 10) // Passing Yds column (10th column)
  const teamRushYards = getNumberValue(offenseTeamRow, 16) // Rushing Yds column (16th column)
  const teamTurnovers = getNumberValue(offenseTeamRow, 5) // TO column

  // Extract defense values from Opp. Stats row (Row 3) - what the team allowed
  const teamPointsAllowed = getNumberValue(defenseTeamRow, 1) // PF column (points allowed)
  const teamYardsAllowed = getNumberValue(defenseTeamRow, 2) // Yds column (yards allowed)
  const teamPassYardsAllowed = getNumberValue(defenseTeamRow, 10) // Passing Yds allowed
  const teamRushYardsAllowed = getNumberValue(defenseTeamRow, 16) // Rushing Yds allowed
  const teamTakeaways = getNumberValue(defenseTeamRow, 5) // Takeaways

  // Extract rankings from Lg Rank Offense row (Row 4)
  const teamPointsRank = getNumberValue(offenseRankRow, 1) // PF rank
  const teamYardsRank = getNumberValue(offenseRankRow, 2) // Yds rank
  const teamPassYardsRank = getNumberValue(offenseRankRow, 10) // Passing Yds rank
  const teamRushYardsRank = getNumberValue(offenseRankRow, 16) // Rushing Yds rank
  const teamTurnoversRank = getNumberValue(offenseRankRow, 5) // TO rank

  // Extract rankings from Lg Rank Defense row (Row 5)
  const teamPointsAllowedRank = getNumberValue(defenseRankRow, 1) // PF allowed rank
  const teamYardsAllowedRank = getNumberValue(defenseRankRow, 2) // Yds allowed rank
  const teamPassYardsAllowedRank = getNumberValue(defenseRankRow, 10) // Passing Yds allowed rank
  const teamRushYardsAllowedRank = getNumberValue(defenseRankRow, 16) // Rushing Yds allowed rank
  const teamTakeawaysRank = getNumberValue(defenseRankRow, 5) // Takeaways rank

  // Extract per-game averages from the rushing and receiving table
  let teamPassYardsPerGame: number | undefined
  let teamRushYardsPerGame: number | undefined

  if (rushingReceivingTable.length > 0) {
    // Find the "Team Totals" row
    let teamTotalsRow = rushingReceivingTable
      .find('tr')
      .filter((i, row) => {
        const $row = $(row)
        const firstCell = $row.find('th, td').first().text().trim()
        return (
          firstCell === 'Team Totals' ||
          firstCell === 'Team' ||
          firstCell.toLowerCase().includes('total')
        )
      })
      .first()

    // If not found, try the last row
    if (teamTotalsRow.length === 0) {
      teamTotalsRow = rushingReceivingTable.find('tr').last()
    }

    if (teamTotalsRow.length > 0) {
      // Extract per-game averages from the correct columns
      teamRushYardsPerGame = getNumberValue(teamTotalsRow, 13) // Rushing Y/G
      teamPassYardsPerGame = getNumberValue(teamTotalsRow, 24) // Receiving Y/G (passing yards)
    }
  }

  const teamStatsData: PFRTeamStats = {
    teamId: teamCode, // Use PFR code as team ID
    teamName,
    season,
    week,
    record: teamRecord,
    overallRecord,
    homeRecord,
    roadRecord,
    offense: {
      rankings: {
        totalYardsRank: teamYardsRank || 0,
        passingYardsRank: teamPassYardsRank || 0,
        rushingYardsRank: teamRushYardsRank || 0,
        pointsScoredRank: teamPointsRank || 0,
        overallRank: 0,
      },
      values: {
        totalYards: teamYards,
        passingYards: teamPassYardsPerGame || teamPassYards, // Use per-game if available, fallback to season total
        rushingYards: teamRushYardsPerGame || teamRushYards, // Use per-game if available, fallback to season total
        pointsPerGame: teamPoints,
      },
    },
    defense: {
      rankings: {
        totalYardsAllowedRank: teamYardsAllowedRank || 0,
        pointsAllowedRank: teamPointsAllowedRank || 0,
        turnoversRank: teamTakeawaysRank || 0,
        overallRank: 0,
      },
      values: {
        totalYardsAllowed: teamYardsAllowed,
        pointsAllowed: teamPointsAllowed,
        takeaways: teamTakeaways,
      },
    },
    // Overall ranks will be calculated below
    overallOffenseRank: 0,
    overallDefenseRank: 0,
    overallTeamRank: 0,
    specialTeamsRank: 16,
  }

  // Calculate overall rankings from individual stat rankings
  const offensiveRanks = [
    teamStatsData.offense.rankings.totalYardsRank,
    teamStatsData.offense.rankings.passingYardsRank,
    teamStatsData.offense.rankings.rushingYardsRank,
    teamStatsData.offense.rankings.pointsScoredRank,
  ].filter(rank => rank > 0) // Only include valid ranks

  const defensiveRanks = [
    teamStatsData.defense.rankings.totalYardsAllowedRank,
    teamStatsData.defense.rankings.pointsAllowedRank,
    teamStatsData.defense.rankings.turnoversRank,
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

  // Save overall into nested groups for convenience
  teamStatsData.offense.rankings.overallRank = teamStatsData.overallOffenseRank
  teamStatsData.defense.rankings.overallRank = teamStatsData.overallDefenseRank

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
