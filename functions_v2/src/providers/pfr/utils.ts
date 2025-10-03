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
 * Convert PFR team name to NFL team object format
 */
export function createNFLTeamFromPFRName(teamName: string): {
  id: string
  name: string
  displayName: string
  abbreviation: string
  color: string
  alternateColor: string
  logo: string
} {
  const pfrCode = getPFRCodeFromTeamName(teamName) || teamName.toLowerCase().replace(/\s+/g, '')
  
  return {
    id: pfrCode,
    name: teamName,
    displayName: teamName,
    abbreviation: pfrCode,
    color: '000000', // Default color - could be enhanced with actual team colors
    alternateColor: '000000',
    logo: '' // Could be enhanced with actual team logos
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
