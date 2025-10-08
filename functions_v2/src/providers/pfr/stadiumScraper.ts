import axios from 'axios'
import * as cheerio from 'cheerio'
import { PFR_BASE, getPFRHeaders } from './utils'

export interface PFRStadium {
  name: string
  city: string
  state: string
  primaryTeams: string[]
  yearsActive: {
    from: number
    to: number
  }
  gamesPlayed: number
}

/**
 * Scrape stadium information from PFR stadiums page
 */
export async function fetchPFRStadiums(): Promise<PFRStadium[]> {
  const url = `${PFR_BASE}/stadiums/`

  const response = await axios.get(url, { headers: getPFRHeaders() })
  const $ = cheerio.load(response.data)

  // Find the stadiums table
  const stadiumsTable = $('table').first()

  if (stadiumsTable.length === 0) {
    console.log('No stadiums table found')
    return []
  }

  const stadiums: PFRStadium[] = []

  // Process only the first 34 rows which contain current NFL stadiums
  stadiumsTable
    .find('tbody tr')
    .slice(0, 35)
    .each((index, row) => {
      const $row = $(row)
      const cells = $row.find('td')

      if (cells.length < 6) {
        return // Skip incomplete rows
      }

      // Extract stadium data from table cells
      // Based on PFR table structure: Stadium Name (th), From (td[0]), To (td[1]), G (td[2]), City (td[3]), State (td[4]), Primary Team(s) (td[5])
      const nameCell = $row.find('th').first()
      const fromCell = cells.eq(0)
      const toCell = cells.eq(1)
      const gamesCell = cells.eq(2)
      const cityCell = cells.eq(3)
      const stateCell = cells.eq(4)
      const teamsCell = cells.eq(5)

      const name = nameCell.text().trim()
      const from = parseInt(fromCell.text().trim(), 10)
      const to = parseInt(toCell.text().trim(), 10)
      const games = parseInt(gamesCell.text().trim(), 10)
      const city = cityCell.text().trim()
      const state = stateCell.text().trim()

      // Extract team names from the teams cell
      const teamLinks = teamsCell.find('a')
      const primaryTeams: string[] = []

      teamLinks.each((i, link) => {
        const teamName = $(link).text().trim()
        if (teamName) {
          primaryTeams.push(teamName)
        }
      })

      // Since we're only processing current NFL stadiums (rows 0-34), include all valid data
      if (name && city && state && !isNaN(from) && !isNaN(to)) {
        stadiums.push({
          name,
          city,
          state,
          primaryTeams,
          yearsActive: { from, to },
          gamesPlayed: isNaN(games) ? 0 : games,
        })
      }
    })

  return stadiums
}

/**
 * Create a mapping of team names to their home stadiums
 */
export function createTeamStadiumMapping(
  stadiums: PFRStadium[]
): Map<string, PFRStadium> {
  const teamStadiumMap = new Map<string, PFRStadium>()

  for (const stadium of stadiums) {
    for (const team of stadium.primaryTeams) {
      // Map various team name formats to the stadium
      const teamVariations = [
        team,
        team.replace(/^The /, ''), // Remove "The" prefix
        team.replace(/ (AFC|NFC)$/, ''), // Remove conference suffix
        team.replace(/ (East|North|South|West)$/, ''), // Remove division suffix
      ]

      for (const variation of teamVariations) {
        teamStadiumMap.set(variation.toLowerCase(), stadium)
      }
    }
  }

  return teamStadiumMap
}

/**
 * Get stadium information for a specific team
 */
export function getStadiumForTeam(
  teamName: string,
  teamStadiumMap: Map<string, PFRStadium>
): PFRStadium | null {
  // Try exact match first
  let stadium = teamStadiumMap.get(teamName.toLowerCase())
  if (stadium) return stadium

  // Try partial matches
  for (const [mappedTeam, mappedStadium] of teamStadiumMap.entries()) {
    if (
      teamName.toLowerCase().includes(mappedTeam) ||
      mappedTeam.includes(teamName.toLowerCase())
    ) {
      return mappedStadium
    }
  }

  return null
}
