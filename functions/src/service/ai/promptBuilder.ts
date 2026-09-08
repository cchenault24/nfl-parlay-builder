import type { ScheduleGame, TeamStats } from '../../providers/espn/types'
import type { OddsSnapshot } from '../../providers/odds/client'
import { formatAmerican } from '../../utils/odds'
import { BetTypeEnum } from './schemas'

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive'

export interface PromptInput {
  game: ScheduleGame
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
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
  }
  if (odds.total) {
    const { line, overPrice, underPrice } = odds.total
    rows.push(
      `- Total: ${line} — Over (${formatAmerican(overPrice)}) / Under (${formatAmerican(underPrice)})`
    )
  }
  if (odds.moneyline) {
    rows.push(
      `- Moneyline: ${game.home.name} (${formatAmerican(odds.moneyline.home)}) / ${game.away.name} (${formatAmerican(odds.moneyline.away)})`
    )
  }
  return (
    `Betting lines from ${odds.bookmaker} (updated ${odds.lastUpdate}):\n${rows.join('\n')}\n` +
    'LINE RULES: a spread leg must use exactly this spread and price for the chosen team; a total leg must use exactly this total ' +
    'and the matching over/under price; a moneyline leg must use exactly this price. Never create alternate lines. ' +
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
    linesSection(input),
    '',
    `Risk level: ${riskLevel}. ${RISK_GUIDANCE[riskLevel]}`,
    '',
    'Leg requirements:',
    '- Every leg must cite specific numbers from the data above in its reasoning (2-3 sentences).',
    '- No contradictory legs: at most one spread leg, one total leg, and one moneyline leg; never both sides of a market.',
    `- "team" must be exactly "${game.home.name}" or "${game.away.name}" (for a total, use the team the leg leans on).`,
    '- "line": for a spread, the chosen team\'s spread from that team\'s perspective (negative = favorite); for a total or player prop, the threshold number; null for a moneyline or anytime/first TD.',
    '- "side": "over" or "under" for totals and yardage/reception props; null otherwise.',
    '- "odds": American price as an integer (e.g. -110, 145).',
    '- "selection": a short human-readable description, e.g. "Chiefs -3.5", "Over 44.5", "Patrick Mahomes Over 262.5 Passing Yards".',
    `- Available bet types: ${BetTypeEnum.options.join(', ')}.`,
    '',
    'Analysis: matchupSummary of 5-7 sentences citing the data; 3-5 keyFactors; gamePrediction with the winner\'s exact team name, a projected score, and the winner\'s win probability.',
  ].join('\n')
}
