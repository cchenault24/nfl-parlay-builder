import type {
  LeagueAverages,
  PregameContext,
  RecentGame,
  ScheduleGame,
  TeamInjury,
  TeamStats,
} from '../../providers/espn/types'
import type { OddsSnapshot } from '../../providers/odds/client'
import { formatAmerican } from '../../utils/odds'
import { BetTypeEnum } from './schemas'

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive'

export interface PromptInput {
  game: ScheduleGame
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  pregame: PregameContext | null
  leagueAverages: LeagueAverages | null
  riskLevel: RiskLevel
}

const RISK_GUIDANCE: Record<RiskLevel, string> = {
  conservative:
    'Prefer higher-probability legs (confidence 0.6-0.75): spreads, totals, and established player props. No long shots.',
  moderate:
    'Balance safety and value (confidence 0.5-0.7). Mix a market leg with player props; one moderate-payout leg is fine.',
  aggressive:
    'Higher risk/reward is acceptable (confidence 0.4-0.65). Anytime TDs, longer player props, and plus-money legs are welcome.',
}

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function venueLine(game: ScheduleGame): string {
  if (!game.venue) {
    return 'Venue: not available'
  }
  const { name, city, state, indoor } = game.venue
  const flags = [indoor ? 'indoor' : 'outdoor', game.neutralSite && 'neutral site']
    .filter(Boolean)
    .join(', ')
  return `Venue: ${name}, ${city}, ${state} (${flags})`
}

function weatherLine(game: ScheduleGame): string {
  if (game.venue?.indoor) {
    return 'Weather: indoor stadium, not a factor'
  }
  if (!game.weather) {
    return 'Weather: not available'
  }
  return `Weather at kickoff: ${game.weather.condition}, ${game.weather.temperatureF}°F`
}

function statLine(label: string, s: { value: number; rank: number }): string {
  const rank = s.rank > 0 ? ` (#${s.rank})` : ''
  return `${label} ${s.value.toFixed(1)}${rank}`
}

function teamStatsBlock(name: string, stats: TeamStats | null): string {
  if (!stats) {
    return `${name}: statistics not available`
  }
  const o = stats.offense
  const d = stats.defense
  return (
    `${name} (${stats.season} season, ${stats.gamesPlayed} games)\n` +
    `- Offense per game: ${[
      statLine('total yards', o.totalYardsPerGame),
      statLine('passing', o.passingYardsPerGame),
      statLine('rushing', o.rushingYardsPerGame),
      statLine('points', o.pointsPerGame),
    ].join(', ')}\n` +
    `- Defense per game: ${[
      statLine('yards allowed', d.yardsAllowedPerGame),
      statLine('pass yards allowed', d.passingYardsAllowedPerGame),
      statLine('rush yards allowed', d.rushingYardsAllowedPerGame),
      statLine('points allowed', d.pointsAllowedPerGame),
    ].join(', ')}, takeaways ${d.takeaways.value} (#${d.takeaways.rank})`
  )
}

function statsSection(input: PromptInput): string {
  const { game, homeStats, awayStats } = input
  const priorSeason = [homeStats, awayStats].some(
    s => s && s.season < game.season
  )
  const note = priorSeason
    ? ` Note: ${game.season} games have not been played yet, so prior-season numbers are shown.`
    : ''
  return (
    `Team statistics (league rank in parentheses, 1 = best).${note}\n` +
    `${teamStatsBlock(game.home.name, homeStats)}\n` +
    `${teamStatsBlock(game.away.name, awayStats)}`
  )
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000)
}

function recentFormLine(name: string, recentGames: RecentGame[]): string {
  if (recentGames.length === 0) {
    return `${name}: no recent games available`
  }
  const results = recentGames
    .slice(0, 5)
    .map(g => `${g.result} ${g.pointsFor}-${g.pointsAgainst} vs ${g.opponent} (wk ${g.week})`)
    .join(', ')
  return `${name}: ${results}`
}

function recentFormSection(input: PromptInput): string {
  const { game, pregame } = input
  if (!pregame) {
    return 'Recent form: not available'
  }
  return (
    'Recent form (last 5 games, most recent first):\n' +
    `${recentFormLine(game.home.name, pregame.home.recentGames)}\n` +
    `${recentFormLine(game.away.name, pregame.away.recentGames)}`
  )
}

function restLine(name: string, recentGames: RecentGame[], kickoff: string): string {
  if (recentGames.length === 0) {
    return `${name}: rest not available`
  }
  const days = daysBetween(recentGames[0].dateTime, kickoff)
  const note = days >= 9 ? ' (extended rest / bye)' : days <= 4 ? ' (short week)' : ''
  return `${name}: ${days} days rest${note}`
}

function restSection(input: PromptInput): string {
  const { game, pregame } = input
  if (!pregame) {
    return 'Rest since last game: not available'
  }
  return (
    'Rest since last game:\n' +
    `${restLine(game.home.name, pregame.home.recentGames, game.dateTime)}\n` +
    `${restLine(game.away.name, pregame.away.recentGames, game.dateTime)}`
  )
}

function injuryLine(name: string, injuries: TeamInjury[]): string {
  if (injuries.length === 0) {
    return `${name}: no notable injuries reported`
  }
  const rows = injuries
    .map(i => `${i.player} (${i.position}) - ${i.status}${i.detail ? `, ${i.detail}` : ''}`)
    .join('; ')
  return `${name}: ${rows}`
}

function injuriesSection(input: PromptInput): string {
  const { game, pregame } = input
  if (!pregame) {
    return 'Injury report: not available'
  }
  return (
    'Injury report:\n' +
    `${injuryLine(game.home.name, pregame.home.injuries)}\n` +
    `${injuryLine(game.away.name, pregame.away.injuries)}`
  )
}

function leagueAverageSection(input: PromptInput): string {
  const { game, leagueAverages } = input
  if (!leagueAverages) {
    return 'League averages: not available'
  }
  const note =
    leagueAverages.season !== game.season ? ` (${leagueAverages.season} season)` : ''
  return (
    `League averages${note}: ${leagueAverages.avgPointsPerTeam} points/team/game, ` +
    `${leagueAverages.avgTotalPoints} combined points/game — use this to judge whether ` +
    'a team or matchup is running hot or cold relative to the league.'
  )
}

function linesSection(input: PromptInput): string {
  const { game, odds } = input
  if (!odds) {
    return (
      'Betting lines: NOT AVAILABLE. Any spread, total, or moneyline leg is therefore an estimate: ' +
      'say so explicitly in its reasoning and keep its confidence at or below 0.6.'
    )
  }
  const rows: string[] = []
  if (odds.spread) {
    const { line, homePrice, awayPrice } = odds.spread
    rows.push(
      `- Spread: ${game.home.name} ${formatAmerican(line)} (${formatAmerican(homePrice)}) / ${game.away.name} ${formatAmerican(-line)} (${formatAmerican(awayPrice)})`
    )
  } else {
    rows.push('- Spread: NOT AVAILABLE for this game')
  }
  if (odds.total) {
    const { line, overPrice, underPrice } = odds.total
    rows.push(
      `- Total: ${line} — Over (${formatAmerican(overPrice)}) / Under (${formatAmerican(underPrice)})`
    )
  } else {
    rows.push('- Total: NOT AVAILABLE for this game')
  }
  if (odds.moneyline) {
    rows.push(
      `- Moneyline: ${game.home.name} (${formatAmerican(odds.moneyline.home)}) / ${game.away.name} (${formatAmerican(odds.moneyline.away)})`
    )
  } else {
    rows.push('- Moneyline: NOT AVAILABLE for this game')
  }
  return (
    `Betting lines from ${odds.bookmaker} (updated ${odds.lastUpdate}):\n${rows.join('\n')}\n` +
    'LINE RULES: your line and price for a spread/total/moneyline leg will be automatically replaced with the exact number ' +
    "shown above before this parlay is shown — focus on picking the right team/side and writing reasoning consistent with " +
    "the book's actual number, not on matching the price exactly. " +
    'Do not create a spread, total, or moneyline leg for a market marked NOT AVAILABLE above — use a player prop instead. ' +
    'Player props have no lines provided: set a realistic line and price yourself and keep confidence modest.'
  )
}

export function buildParlayPrompt(input: PromptInput): string {
  const { game, riskLevel } = input
  return [
    `Generate a 3-leg NFL parlay for ${game.away.name} @ ${game.home.name} — Week ${game.week}, ${game.season} season, kickoff ${formatKickoff(game.dateTime)} ET.`,
    venueLine(game),
    weatherLine(game),
    `Records: ${game.home.name} ${game.home.record} (home ${game.home.homeRecord}); ${game.away.name} ${game.away.record} (road ${game.away.roadRecord}).`,
    '',
    statsSection(input),
    '',
    recentFormSection(input),
    '',
    restSection(input),
    '',
    injuriesSection(input),
    '',
    leagueAverageSection(input),
    '',
    linesSection(input),
    '',
    `Risk level: ${riskLevel}. ${RISK_GUIDANCE[riskLevel]}`,
    '',
    'Analysis requirements:',
    '- matchupSummary: 5-7 sentences citing the data above.',
    '- keyFactors: 3-5 short factors driving your read on this game (recent form, injuries, rest, and league-average context are all fair game alongside the season stats).',
    '- gamePrediction: winner (exact team name), a projected score, and the winner\'s win probability — form this read before you pick legs, and keep the legs consistent with it.',
    '',
    'Leg requirements:',
    '- Every leg must cite specific numbers from the data above in its reasoning (2-3 sentences).',
    '- No contradictory legs: at most one spread leg, one total leg, and one moneyline leg; never both sides of a market.',
    `- "team" must be exactly "${game.home.name}" or "${game.away.name}" (for a total, use the team the leg leans on).`,
    '- "player": for a player_* bet type, the player\'s full name exactly as it would appear in an NFL box score (e.g. "Patrick Mahomes"); null for every other bet type.',
    '- "line": for a spread, the chosen team\'s spread from that team\'s perspective (negative = favorite); for a total or player prop, the threshold number; null for a moneyline or anytime/first TD.',
    '- "side": "over" or "under" for totals and yardage/reception props; null otherwise.',
    '- "odds": American price as an integer (e.g. -110, 145).',
    '- "selection": a short human-readable description, e.g. "Chiefs -3.5", "Over 44.5", "Patrick Mahomes Over 262.5 Passing Yards".',
    `- Available bet types: ${BetTypeEnum.options.join(', ')}.`,
    '- EDGE RULE: for a spread, total, or moneyline leg (these get anchored to the exact book price above), your confidence must be strictly greater than that price\'s break-even win rate (e.g. -150 breaks even at 60%, +130 at ~43%) — if you don\'t believe a market leg clears its own price, pick a different leg instead; it will be rejected otherwise. Player props (no posted price) are exempt — set their confidence honestly.',
    '- CORRELATION: avoid stacking legs whose outcomes move together (e.g. a team\'s spread, that team\'s QB Over passing yards, and the game Over all tend to hit or miss as a group) — a 3-leg parlay built entirely from correlated pieces overstates the real combined probability. Prefer at least one leg that\'s largely independent of the others, or say so in your reasoning if you stack anyway.',
  ].join('\n')
}
