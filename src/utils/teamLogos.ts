/**
 * Team logo utilities for fetching and displaying NFL team logos
 */

// Team abbreviation mapping for consistent logo fetching
const TEAM_ABBREVIATIONS: Record<string, string> = {
  // AFC East
  'buffalo bills': 'BUF',
  'miami dolphins': 'MIA',
  'new england patriots': 'NE',
  'new york jets': 'NYJ',

  // AFC North
  'baltimore ravens': 'BAL',
  'cincinnati bengals': 'CIN',
  'cleveland browns': 'CLE',
  'pittsburgh steelers': 'PIT',

  // AFC South
  'houston texans': 'HOU',
  'indianapolis colts': 'IND',
  'jacksonville jaguars': 'JAX',
  'tennessee titans': 'TEN',

  // AFC West
  'denver broncos': 'DEN',
  'kansas city chiefs': 'KC',
  'las vegas raiders': 'LV',
  'los angeles chargers': 'LAC',

  // NFC East
  'dallas cowboys': 'DAL',
  'new york giants': 'NYG',
  'philadelphia eagles': 'PHI',
  'washington commanders': 'WAS',

  // NFC North
  'chicago bears': 'CHI',
  'detroit lions': 'DET',
  'green bay packers': 'GB',
  'minnesota vikings': 'MIN',

  // NFC South
  'atlanta falcons': 'ATL',
  'carolina panthers': 'CAR',
  'new orleans saints': 'NO',
  'tampa bay buccaneers': 'TB',

  // NFC West
  'arizona cardinals': 'ARI',
  'los angeles rams': 'LAR',
  'san francisco 49ers': 'SF',
  'seattle seahawks': 'SEA',
}

/**
 * Get team abbreviation from team name
 */
export function getTeamAbbreviation(teamName: string): string {
  const normalizedName = teamName.toLowerCase().trim()

  // Direct match first
  if (TEAM_ABBREVIATIONS[normalizedName]) {
    return TEAM_ABBREVIATIONS[normalizedName]
  }

  // Try partial matches for common variations
  for (const [key, value] of Object.entries(TEAM_ABBREVIATIONS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value
    }
  }

  // Try matching by city or team name parts
  const nameParts = normalizedName.split(' ')
  for (const part of nameParts) {
    for (const [key, value] of Object.entries(TEAM_ABBREVIATIONS)) {
      if (key.includes(part) || part.includes(key.split(' ')[0])) {
        return value
      }
    }
  }

  // Fallback to first 3 characters
  return teamName.toUpperCase().slice(0, 3)
}

/**
 * Generate logo URL using ESPN
 */
export function getTeamLogoUrl(teamName: string): string {
  const abbreviation = getTeamAbbreviation(teamName)
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbreviation.toLowerCase()}.png`
}
