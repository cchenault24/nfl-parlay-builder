import type { ScheduleGame, TeamRef, TeamStats } from '../providers/espn/types'
import type { OddsSnapshot } from '../providers/odds/client'
import type { AIAnalysis } from '../service/ai/schemas'
import type { ProcessedLeg } from '../agent/shared/schemas'

// Builders, not constants. Every test that needs a game needs a *slightly*
// different one, and a shared frozen object would have each test reading the
// fixture file to find out what it was actually asserting against.

function teamRef(overrides: Partial<TeamRef> & Pick<TeamRef, 'name' | 'abbrev'>): TeamRef {
  return {
    teamId: overrides.abbrev.toLowerCase(),
    record: '3-1',
    homeRecord: '2-0',
    roadRecord: '1-1',
    ...overrides,
  }
}

export function makeGame(overrides: Partial<ScheduleGame> = {}): ScheduleGame {
  return {
    gameId: 'g-bal-cin',
    season: 2026,
    week: 5,
    dateTime: '2026-10-11T17:00:00Z',
    status: 'scheduled',
    neutralSite: false,
    home: teamRef({ name: 'Baltimore Ravens', abbrev: 'BAL' }),
    away: teamRef({ name: 'Cincinnati Bengals', abbrev: 'CIN' }),
    venue: { name: 'M&T Bank Stadium', city: 'Baltimore', state: 'MD', indoor: false },
    weather: { condition: 'Clear', temperatureF: 62 },
    homeScore: null,
    awayScore: null,
    ...overrides,
  }
}

export function makeSecondGame(overrides: Partial<ScheduleGame> = {}): ScheduleGame {
  return makeGame({
    gameId: 'g-kc-den',
    home: teamRef({ name: 'Denver Broncos', abbrev: 'DEN' }),
    away: teamRef({ name: 'Kansas City Chiefs', abbrev: 'KC' }),
    ...overrides,
  })
}

// Defaults to an unanchored leg: anchoring brings the confidence-versus-price
// rule with it, and a test that did not ask for that rule should not trip it.
export function makeLeg(overrides: Partial<ProcessedLeg> = {}): ProcessedLeg {
  return {
    betType: 'spread',
    team: 'Baltimore Ravens',
    player: null,
    selection: 'Ravens -3.5',
    line: -3.5,
    side: null,
    odds: -110,
    confidence: 0.6,
    reasoning: 'Ravens are 3rd in rushing yards per game against a 28th-ranked run defense.',
    anchored: false,
    ...overrides,
  }
}

export function makeAnalysis(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
  return {
    matchupSummary: 'Baltimore controls the line of scrimmage.',
    keyFactors: ['Rush defense', 'Rest advantage', 'Weather'],
    gamePrediction: {
      winner: 'Baltimore Ravens',
      projectedScore: { home: 27, away: 20 },
      winProbability: 0.62,
    },
    ...overrides,
  }
}

export function makeOdds(overrides: Partial<OddsSnapshot> = {}): OddsSnapshot {
  return {
    eventId: 'evt-1',
    bookmaker: 'DraftKings',
    bookmakerKey: 'draftkings',
    lastUpdate: '2026-10-10T12:00:00Z',
    spread: { line: -3.5, homePrice: -110, awayPrice: -110 },
    total: { line: 44.5, overPrice: -108, underPrice: -112 },
    moneyline: { home: -185, away: 155 },
    ...overrides,
  }
}

export function makeTeamStats(overrides: Partial<TeamStats> = {}): TeamStats {
  const ranked = (value: number, rank: number) => ({ value, rank })
  return {
    teamId: 'bal',
    teamName: 'Baltimore Ravens',
    season: 2026,
    gamesPlayed: 4,
    offense: {
      totalYardsPerGame: ranked(388.2, 3),
      passingYardsPerGame: ranked(241.5, 8),
      rushingYardsPerGame: ranked(146.7, 2),
      pointsPerGame: ranked(27.4, 4),
    },
    defense: {
      yardsAllowedPerGame: ranked(312.1, 9),
      passingYardsAllowedPerGame: ranked(210.4, 12),
      rushingYardsAllowedPerGame: ranked(101.7, 6),
      pointsAllowedPerGame: ranked(19.2, 5),
      takeaways: ranked(8, 7),
    },
    overallOffenseRank: 3,
    overallDefenseRank: 6,
    overallRank: 4,
    ...overrides,
  }
}
