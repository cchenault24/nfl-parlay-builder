import type { GameBoxScore } from '../providers/espn/types'

export type LegOutcome = 'won' | 'lost' | 'push' | 'ungraded'
export type ParlayOutcome = 'won' | 'lost' | 'push' | 'partial'

export interface GradableLeg {
  betType: string
  team: string
  player: string | null
  line: number | null
  side: 'over' | 'under' | null
}

export interface GameResult {
  homeTeamName: string
  awayTeamName: string
  homeScore: number
  awayScore: number
}

// Bet types this pass can't grade with confidence: half-by-half scores and
// scoring-play order aren't fetched, and "longest completion" has no matching
// box score stat. Better to say "ungraded" than guess and risk a wrong verdict.
const UNGRADEABLE = new Set([
  'first_half_spread',
  'first_half_total',
  'player_longest_completion',
  'player_first_td',
])

// ESPN reports some stats as a single "made/attempted" string (e.g. "18/35"
// for completions/attempts) — `part` selects which side of the slash.
function parseSlashPart(raw: string | undefined, part: 0 | 1): number | null {
  if (raw === undefined) {
    return null
  }
  const piece = raw.includes('/') ? raw.split('/')[part] : raw
  const num = parseFloat(piece)
  return Number.isFinite(num) ? num : null
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

function teamBox(box: GameBoxScore, teamName: string, game: GameResult) {
  return teamName === game.homeTeamName ? box.home : box.away
}

function findAthleteValue(
  box: GameBoxScore | null,
  teamName: string,
  game: GameResult,
  playerName: string | null,
  category: string,
  key: string,
  part: 0 | 1 = 0
): number | null {
  if (!box || !playerName) {
    return null
  }
  const athletes = teamBox(box, teamName, game).categories[category]
  if (!athletes) {
    return null
  }
  const target = normalizeName(playerName)
  const athlete =
    athletes.find(a => normalizeName(a.name) === target) ??
    athletes.find(
      a =>
        normalizeName(a.name).includes(target) ||
        target.includes(normalizeName(a.name))
    )
  return athlete ? parseSlashPart(athlete.stats[key], part) : null
}

function sumTeamValue(
  box: GameBoxScore | null,
  teamName: string,
  game: GameResult,
  categories: string[],
  key: string,
  part: 0 | 1 = 0
): number | null {
  if (!box) {
    return null
  }
  const team = teamBox(box, teamName, game)
  let total = 0
  let found = false
  for (const category of categories) {
    for (const athlete of team.categories[category] ?? []) {
      const value = parseSlashPart(athlete.stats[key], part)
      if (value !== null) {
        total += value
        found = true
      }
    }
  }
  return found ? total : null
}

function gradeOverUnder(actual: number | null, leg: GradableLeg): LegOutcome {
  if (actual === null || leg.line === null || !leg.side) {
    return 'ungraded'
  }
  if (actual === leg.line) {
    return 'push'
  }
  const hitOver = actual > leg.line
  return (leg.side === 'over') === hitOver ? 'won' : 'lost'
}

function gradeAtLeastOne(actual: number | null): LegOutcome {
  return actual === null ? 'ungraded' : actual > 0 ? 'won' : 'lost'
}

export function gradeLeg(
  leg: GradableLeg,
  game: GameResult,
  box: GameBoxScore | null
): LegOutcome {
  if (UNGRADEABLE.has(leg.betType)) {
    return 'ungraded'
  }

  const isHome = leg.team === game.homeTeamName
  const teamScore = isHome ? game.homeScore : game.awayScore
  const oppScore = isHome ? game.awayScore : game.homeScore

  switch (leg.betType) {
    case 'moneyline':
      return teamScore === oppScore ? 'push' : teamScore > oppScore ? 'won' : 'lost'
    case 'spread': {
      if (leg.line === null) {
        return 'ungraded'
      }
      const margin = teamScore + leg.line - oppScore
      return margin === 0 ? 'push' : margin > 0 ? 'won' : 'lost'
    }
    case 'total':
      return gradeOverUnder(game.homeScore + game.awayScore, leg)
    case 'team_total_points':
      return gradeOverUnder(teamScore, leg)
    case 'player_passing_yards':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'passing', 'passingYards'),
        leg
      )
    case 'player_passing_completions':
      return gradeOverUnder(
        findAthleteValue(
          box,
          leg.team,
          game,
          leg.player,
          'passing',
          'completions/passingAttempts',
          0
        ),
        leg
      )
    case 'player_passing_attempts':
      return gradeOverUnder(
        findAthleteValue(
          box,
          leg.team,
          game,
          leg.player,
          'passing',
          'completions/passingAttempts',
          1
        ),
        leg
      )
    case 'player_passing_tds':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'passing', 'passingTouchdowns'),
        leg
      )
    case 'player_interceptions':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'passing', 'interceptions'),
        leg
      )
    case 'player_rushing_yards':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'rushing', 'rushingYards'),
        leg
      )
    case 'player_rushing_attempts':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'rushing', 'rushingAttempts'),
        leg
      )
    case 'player_rushing_tds':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'rushing', 'rushingTouchdowns'),
        leg
      )
    case 'player_longest_rush':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'rushing', 'longRushing'),
        leg
      )
    case 'player_receiving_yards':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'receiving', 'receivingYards'),
        leg
      )
    case 'player_receptions':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'receiving', 'receptions'),
        leg
      )
    case 'player_receiving_tds':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'receiving', 'receivingTouchdowns'),
        leg
      )
    case 'player_longest_reception':
      return gradeOverUnder(
        findAthleteValue(box, leg.team, game, leg.player, 'receiving', 'longReception'),
        leg
      )
    case 'player_rush_rec_yards': {
      const rush = findAthleteValue(box, leg.team, game, leg.player, 'rushing', 'rushingYards')
      const rec = findAthleteValue(box, leg.team, game, leg.player, 'receiving', 'receivingYards')
      if (rush === null && rec === null) {
        return 'ungraded'
      }
      return gradeOverUnder((rush ?? 0) + (rec ?? 0), leg)
    }
    case 'player_anytime_td': {
      const rushTds = findAthleteValue(
        box,
        leg.team,
        game,
        leg.player,
        'rushing',
        'rushingTouchdowns'
      )
      const recTds = findAthleteValue(
        box,
        leg.team,
        game,
        leg.player,
        'receiving',
        'receivingTouchdowns'
      )
      if (rushTds === null && recTds === null) {
        return 'ungraded'
      }
      return gradeAtLeastOne((rushTds ?? 0) + (recTds ?? 0))
    }
    case 'team_total_tds': {
      const rush = sumTeamValue(box, leg.team, game, ['rushing'], 'rushingTouchdowns')
      const rec = sumTeamValue(box, leg.team, game, ['receiving'], 'receivingTouchdowns')
      const def = sumTeamValue(box, leg.team, game, ['defensive'], 'defensiveTouchdowns')
      if (rush === null && rec === null && def === null) {
        return 'ungraded'
      }
      return gradeOverUnder((rush ?? 0) + (rec ?? 0) + (def ?? 0), leg)
    }
    case 'field_goals_made':
      return gradeOverUnder(
        sumTeamValue(box, leg.team, game, ['kicking'], 'fieldGoalsMade/fieldGoalAttempts', 0),
        leg
      )
    case 'kicking_points':
      return gradeOverUnder(
        sumTeamValue(box, leg.team, game, ['kicking'], 'totalKickingPoints'),
        leg
      )
    case 'defensive_sacks':
      return gradeOverUnder(sumTeamValue(box, leg.team, game, ['defensive'], 'sacks'), leg)
    case 'defensive_interceptions':
      return gradeOverUnder(
        sumTeamValue(box, leg.team, game, ['interceptions'], 'interceptions'),
        leg
      )
    default:
      return 'ungraded'
  }
}

export function combineParlayOutcome(outcomes: LegOutcome[]): ParlayOutcome {
  if (outcomes.includes('lost')) {
    return 'lost'
  }
  if (outcomes.some(o => o === 'ungraded')) {
    return 'partial'
  }
  return outcomes.every(o => o === 'push') ? 'push' : 'won'
}
