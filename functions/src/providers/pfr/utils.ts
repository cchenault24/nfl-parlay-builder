import { PFRTeam } from './types'

export const PFR_BASE = 'https://www.pro-football-reference.com'

/**
 * Helper function to map team names to PFR codes
 */
export function getPFRCodeFromTeamName(teamName: string): string | null {
  const teamNameToPFRCode: { [key: string]: string } = {
    'Dallas Cowboys': 'dal',
    'San Francisco 49ers': 'sfo',
    'Kansas City Chiefs': 'kan',
    'Buffalo Bills': 'buf',
    'Miami Dolphins': 'mia',
    'New England Patriots': 'nwe',
    'New York Jets': 'nyj',
    'Baltimore Ravens': 'rav',
    'Cincinnati Bengals': 'cin',
    'Cleveland Browns': 'cle',
    'Pittsburgh Steelers': 'pit',
    'Houston Texans': 'htx',
    'Indianapolis Colts': 'clt',
    'Jacksonville Jaguars': 'jax',
    'Tennessee Titans': 'oti',
    'Denver Broncos': 'den',
    'Las Vegas Raiders': 'rai',
    'Los Angeles Chargers': 'sdg',
    'Arizona Cardinals': 'crd',
    'Los Angeles Rams': 'ram',
    'Seattle Seahawks': 'sea',
    'Atlanta Falcons': 'atl',
    'Carolina Panthers': 'car',
    'New Orleans Saints': 'nor',
    'Tampa Bay Buccaneers': 'tam',
    'Chicago Bears': 'chi',
    'Detroit Lions': 'det',
    'Green Bay Packers': 'gnb',
    'Minnesota Vikings': 'min',
    'New York Giants': 'nyg',
    'Philadelphia Eagles': 'phi',
    'Washington Commanders': 'was',
  }

  return teamNameToPFRCode[teamName] || null
}

/**
 * Get team abbreviation from team name for logo URLs
 */
function getTeamAbbreviation(teamName: string): string {
  const teamNameToAbbreviation: { [key: string]: string } = {
    'Dallas Cowboys': 'DAL',
    'San Francisco 49ers': 'SF',
    'Kansas City Chiefs': 'KC',
    'Buffalo Bills': 'BUF',
    'Miami Dolphins': 'MIA',
    'New England Patriots': 'NE',
    'New York Jets': 'NYJ',
    'Baltimore Ravens': 'BAL',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Pittsburgh Steelers': 'PIT',
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX',
    'Tennessee Titans': 'TEN',
    'Denver Broncos': 'DEN',
    'Las Vegas Raiders': 'LV',
    'Los Angeles Chargers': 'LAC',
    'Arizona Cardinals': 'ARI',
    'Los Angeles Rams': 'LAR',
    'Seattle Seahawks': 'SEA',
    'Atlanta Falcons': 'ATL',
    'Carolina Panthers': 'CAR',
    'New Orleans Saints': 'NO',
    'Tampa Bay Buccaneers': 'TB',
    'Chicago Bears': 'CHI',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GB',
    'Minnesota Vikings': 'MIN',
    'New York Giants': 'NYG',
    'Philadelphia Eagles': 'PHI',
    'Washington Commanders': 'WAS',
  }

  return teamNameToAbbreviation[teamName] || teamName.toUpperCase().slice(0, 3)
}

/**
 * Generate logo URL using Fantasy Nerds API
 */
function getTeamLogoUrl(teamName: string): string {
  const abbreviation = getTeamAbbreviation(teamName)
  return `https://www.fantasynerds.com/images/nfl/teams/${abbreviation}.gif`
}

/**
 * Create a PFRTeam object from a team name string
 */
export function createPFRTeamFromName(teamName: string): PFRTeam {
  const pfrCode =
    getPFRCodeFromTeamName(teamName) ||
    teamName.toLowerCase().replace(/\s+/g, '')
  const abbreviation = getTeamAbbreviation(teamName)

  return {
    id: pfrCode,
    name: teamName,
    displayName: teamName,
    abbreviation,
    color: '000000', // Default color - could be enhanced with actual team colors
    alternateColor: '000000',
    logo: getTeamLogoUrl(teamName),
  }
}

/**
 * Get common headers for PFR requests
 */
export function getPFRHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  }
}
