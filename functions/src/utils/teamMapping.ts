/**
 * Centralized NFL team mapping utilities
 * Maps team codes to full team names and vice versa
 */

export interface TeamMapping {
  code: string
  name: string
  abbreviation: string
  pfrCode: string
  stadium: string
  city: string
  state: string
}

/**
 * Complete mapping of all 32 NFL teams
 * Maps team codes (used in gameIds) to full team names
 */
export const NFL_TEAMS: Record<string, TeamMapping> = {
  // AFC East
  BUF: {
    code: 'BUF',
    name: 'Buffalo Bills',
    abbreviation: 'BUF',
    pfrCode: 'buf',
    stadium: 'Highmark Stadium',
    city: 'Orchard Park',
    state: 'NY',
  },
  MIA: {
    code: 'MIA',
    name: 'Miami Dolphins',
    abbreviation: 'MIA',
    pfrCode: 'mia',
    stadium: 'Hard Rock Stadium',
    city: 'Miami Gardens',
    state: 'FL',
  },
  NE: {
    code: 'NE',
    name: 'New England Patriots',
    abbreviation: 'NE',
    pfrCode: 'nwe',
    stadium: 'Gillette Stadium',
    city: 'Foxborough',
    state: 'MA',
  },
  NYJ: {
    code: 'NYJ',
    name: 'New York Jets',
    abbreviation: 'NYJ',
    pfrCode: 'nyj',
    stadium: 'MetLife Stadium',
    city: 'East Rutherford',
    state: 'NJ',
  },

  // AFC North
  BAL: {
    code: 'BAL',
    name: 'Baltimore Ravens',
    abbreviation: 'BAL',
    pfrCode: 'rav',
    stadium: 'M&T Bank Stadium',
    city: 'Baltimore',
    state: 'MD',
  },
  CIN: {
    code: 'CIN',
    name: 'Cincinnati Bengals',
    abbreviation: 'CIN',
    pfrCode: 'cin',
    stadium: 'Paycor Stadium',
    city: 'Cincinnati',
    state: 'OH',
  },
  CLE: {
    code: 'CLE',
    name: 'Cleveland Browns',
    abbreviation: 'CLE',
    pfrCode: 'cle',
    stadium: 'FirstEnergy Stadium',
    city: 'Cleveland',
    state: 'OH',
  },
  PIT: {
    code: 'PIT',
    name: 'Pittsburgh Steelers',
    abbreviation: 'PIT',
    pfrCode: 'pit',
    stadium: 'Acrisure Stadium',
    city: 'Pittsburgh',
    state: 'PA',
  },

  // AFC South
  HOU: {
    code: 'HOU',
    name: 'Houston Texans',
    abbreviation: 'HOU',
    pfrCode: 'htx',
    stadium: 'NRG Stadium',
    city: 'Houston',
    state: 'TX',
  },
  IND: {
    code: 'IND',
    name: 'Indianapolis Colts',
    abbreviation: 'IND',
    pfrCode: 'clt',
    stadium: 'Lucas Oil Stadium',
    city: 'Indianapolis',
    state: 'IN',
  },
  JAX: {
    code: 'JAX',
    name: 'Jacksonville Jaguars',
    abbreviation: 'JAX',
    pfrCode: 'jax',
    stadium: 'TIAA Bank Field',
    city: 'Jacksonville',
    state: 'FL',
  },
  TEN: {
    code: 'TEN',
    name: 'Tennessee Titans',
    abbreviation: 'TEN',
    pfrCode: 'oti',
    stadium: 'Nissan Stadium',
    city: 'Nashville',
    state: 'TN',
  },

  // AFC West
  DEN: {
    code: 'DEN',
    name: 'Denver Broncos',
    abbreviation: 'DEN',
    pfrCode: 'den',
    stadium: 'Empower Field at Mile High',
    city: 'Denver',
    state: 'CO',
  },
  KC: {
    code: 'KC',
    name: 'Kansas City Chiefs',
    abbreviation: 'KC',
    pfrCode: 'kan',
    stadium: 'Arrowhead Stadium',
    city: 'Kansas City',
    state: 'MO',
  },
  LV: {
    code: 'LV',
    name: 'Las Vegas Raiders',
    abbreviation: 'LV',
    pfrCode: 'rai',
    stadium: 'Allegiant Stadium',
    city: 'Las Vegas',
    state: 'NV',
  },
  LAC: {
    code: 'LAC',
    name: 'Los Angeles Chargers',
    abbreviation: 'LAC',
    pfrCode: 'sdg',
    stadium: 'SoFi Stadium',
    city: 'Inglewood',
    state: 'CA',
  },

  // NFC East
  DAL: {
    code: 'DAL',
    name: 'Dallas Cowboys',
    abbreviation: 'DAL',
    pfrCode: 'dal',
    stadium: 'AT&T Stadium',
    city: 'Arlington',
    state: 'TX',
  },
  NYG: {
    code: 'NYG',
    name: 'New York Giants',
    abbreviation: 'NYG',
    pfrCode: 'nyg',
    stadium: 'MetLife Stadium',
    city: 'East Rutherford',
    state: 'NJ',
  },
  PHI: {
    code: 'PHI',
    name: 'Philadelphia Eagles',
    abbreviation: 'PHI',
    pfrCode: 'phi',
    stadium: 'Lincoln Financial Field',
    city: 'Philadelphia',
    state: 'PA',
  },
  WAS: {
    code: 'WAS',
    name: 'Washington Commanders',
    abbreviation: 'WAS',
    pfrCode: 'was',
    stadium: 'FedExField',
    city: 'Landover',
    state: 'MD',
  },

  // NFC North
  CHI: {
    code: 'CHI',
    name: 'Chicago Bears',
    abbreviation: 'CHI',
    pfrCode: 'chi',
    stadium: 'Soldier Field',
    city: 'Chicago',
    state: 'IL',
  },
  DET: {
    code: 'DET',
    name: 'Detroit Lions',
    abbreviation: 'DET',
    pfrCode: 'det',
    stadium: 'Ford Field',
    city: 'Detroit',
    state: 'MI',
  },
  GB: {
    code: 'GB',
    name: 'Green Bay Packers',
    abbreviation: 'GB',
    pfrCode: 'gnb',
    stadium: 'Lambeau Field',
    city: 'Green Bay',
    state: 'WI',
  },
  MIN: {
    code: 'MIN',
    name: 'Minnesota Vikings',
    abbreviation: 'MIN',
    pfrCode: 'min',
    stadium: 'U.S. Bank Stadium',
    city: 'Minneapolis',
    state: 'MN',
  },

  // NFC South
  ATL: {
    code: 'ATL',
    name: 'Atlanta Falcons',
    abbreviation: 'ATL',
    pfrCode: 'atl',
    stadium: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    state: 'GA',
  },
  CAR: {
    code: 'CAR',
    name: 'Carolina Panthers',
    abbreviation: 'CAR',
    pfrCode: 'car',
    stadium: 'Bank of America Stadium',
    city: 'Charlotte',
    state: 'NC',
  },
  NO: {
    code: 'NO',
    name: 'New Orleans Saints',
    abbreviation: 'NO',
    pfrCode: 'nor',
    stadium: 'Caesars Superdome',
    city: 'New Orleans',
    state: 'LA',
  },
  TB: {
    code: 'TB',
    name: 'Tampa Bay Buccaneers',
    abbreviation: 'TB',
    pfrCode: 'tam',
    stadium: 'Raymond James Stadium',
    city: 'Tampa',
    state: 'FL',
  },

  // NFC West
  ARI: {
    code: 'ARI',
    name: 'Arizona Cardinals',
    abbreviation: 'ARI',
    pfrCode: 'crd',
    stadium: 'State Farm Stadium',
    city: 'Glendale',
    state: 'AZ',
  },
  LAR: {
    code: 'LAR',
    name: 'Los Angeles Rams',
    abbreviation: 'LAR',
    pfrCode: 'ram',
    stadium: 'SoFi Stadium',
    city: 'Inglewood',
    state: 'CA',
  },
  RAM: {
    code: 'RAM',
    name: 'Los Angeles Rams',
    abbreviation: 'LAR',
    pfrCode: 'ram',
    stadium: 'SoFi Stadium',
    city: 'Inglewood',
    state: 'CA',
  }, // Legacy code
  SEA: {
    code: 'SEA',
    name: 'Seattle Seahawks',
    abbreviation: 'SEA',
    pfrCode: 'sea',
    stadium: 'Lumen Field',
    city: 'Seattle',
    state: 'WA',
  },
  SFO: {
    code: 'SFO',
    name: 'San Francisco 49ers',
    abbreviation: 'SF',
    pfrCode: 'sfo',
    stadium: "Levi's Stadium",
    city: 'Santa Clara',
    state: 'CA',
  },
}

/**
 * Get team name from team code
 */
export function getTeamNameFromCode(code: string): string {
  const team = NFL_TEAMS[code.toUpperCase()]
  return team?.name || `Unknown Team (${code})`
}

/**
 * Get team code from team name
 */
export function getTeamCodeFromName(name: string): string | null {
  const normalizedName = name.toLowerCase().trim()

  for (const [code, team] of Object.entries(NFL_TEAMS)) {
    if (team.name.toLowerCase() === normalizedName) {
      return code
    }
  }

  return null
}

/**
 * Get team abbreviation from team code
 */
export function getTeamAbbreviationFromCode(code: string): string {
  const team = NFL_TEAMS[code.toUpperCase()]
  return team?.abbreviation || code.toUpperCase()
}

/**
 * Get PFR code from team code
 */
export function getPFRCodeFromTeamCode(code: string): string {
  const team = NFL_TEAMS[code.toUpperCase()]
  return team?.pfrCode || code.toLowerCase()
}

/**
 * Check if a team code is valid
 */
export function isValidTeamCode(code: string): boolean {
  return code.toUpperCase() in NFL_TEAMS
}

/**
 * Get all team codes
 */
export function getAllTeamCodes(): string[] {
  return Object.keys(NFL_TEAMS)
}

/**
 * Get all team names
 */
export function getAllTeamNames(): string[] {
  return Object.values(NFL_TEAMS).map(team => team.name)
}

/**
 * Get stadium information from team code
 */
export function getStadiumFromTeamCode(
  code: string
): { stadium: string; city: string; state: string } | null {
  const team = NFL_TEAMS[code.toUpperCase()]
  if (!team) {
    return null
  }

  return {
    stadium: team.stadium,
    city: team.city,
    state: team.state,
  }
}

/**
 * Get stadium name from team code
 */
export function getStadiumNameFromTeamCode(code: string): string {
  const team = NFL_TEAMS[code.toUpperCase()]
  return team?.stadium || `Unknown Stadium (${code})`
}

/**
 * Get city and state from team code
 */
export function getLocationFromTeamCode(code: string): string {
  const team = NFL_TEAMS[code.toUpperCase()]
  if (!team) {
    return `Unknown Location (${code})`
  }

  return `${team.city}, ${team.state}`
}
