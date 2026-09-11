import type {
  LeagueAverages,
  PregameContext,
  RecentGame,
  ScheduleGame,
  TeamInjury,
  TeamStats,
} from '../../providers/espn/types'
import type { TeamEpaStats, TeamEpa } from '../../providers/nflverse/types'
import type { OddsSnapshot } from '../../providers/odds/client'
import { formatAmerican } from '../../utils/odds'
import { BetTypeEnum } from './schemas'

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive'

// Everything gathered for one game. A run carries one of these per requested
// game; a single-game run carries exactly one, and the prompt it produces reads
// the way the single-game prompt always has.
export interface PromptGame {
  game: ScheduleGame
  homeStats: TeamStats | null
  awayStats: TeamStats | null
  odds: OddsSnapshot | null
  pregame: PregameContext | null
  epa: TeamEpaStats | null
}

export interface PromptInput {
  games: PromptGame[]
  // Slate-wide, so it is fetched once and stated once rather than per game.
  leagueAverages: LeagueAverages | null
  riskLevel: RiskLevel
  // Derived from the user's tier, and from which markets the books actually
  // posted. Both the prompt and validateDraft use the same numbers, so the
  // model is never asked for a shape that would then be rejected.
  legCount: number
  playerProps: boolean
}

const RISK_GUIDANCE: Record<RiskLevel, string> = {
  conservative:
    'Prefer higher-probability legs (confidence 0.6-0.75): spreads, totals, and established player props. No long shots.',
  moderate:
    'Balance safety and value (confidence 0.5-0.7). Mix a market leg with player props; one moderate-payout leg is fine.',
  aggressive:
    'Higher risk/reward is acceptable (confidence 0.4-0.65). Anytime TDs, longer player props, and plus-money legs are welcome.',
}

// The same guidance with every prop reference removed. A plan without props that
// was still told to "mix in player props" produces legs the validator then
// rejects, which reads to the user as the generator being broken.
const RISK_GUIDANCE_NO_PROPS: Record<RiskLevel, string> = {
  conservative:
    'Prefer higher-probability legs (confidence 0.6-0.75): spreads and totals. No long shots.',
  moderate:
    'Balance safety and value (confidence 0.5-0.7); one moderate-payout leg is fine.',
  aggressive:
    'Higher risk/reward is acceptable (confidence 0.4-0.65). Plus-money legs are welcome.',
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
  const flags = [
    indoor ? 'indoor' : 'outdoor',
    game.neutralSite && 'neutral site',
  ]
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

function statsSection(entry: PromptGame): string {
  const { game, homeStats, awayStats } = entry
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

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(3)}`
}

function epaLine(name: string, epa: TeamEpa): string {
  const trend =
    epa.offEpaPerPlayLast3 === null
      ? 'last 3 games not available'
      : `last 3 games ${signed(epa.offEpaPerPlayLast3)}`
  return (
    `${name}: offense ${signed(epa.offEpaPerPlay)} EPA/play, ` +
    `defense ${signed(epa.defEpaPerPlayAllowed)} EPA/play allowed ` +
    `(${trend}; ${epa.games} games)`
  )
}

function epaSection(entry: PromptGame): string {
  const { game, epa } = entry
  if (!epa) {
    return 'EPA efficiency: not available'
  }
  const note = epa.season !== game.season ? ` (${epa.season} season)` : ''
  return (
    `EPA efficiency${note} — expected points added per play, where league average is ` +
    'about 0.000. Higher offense is better; lower defense allowed is better. Season-long ' +
    'numbers are the more reliable signal, with the last-3-game figure showing current form:\n' +
    `${epaLine(game.home.name, epa.home)}\n${epaLine(game.away.name, epa.away)}`
  )
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000
  )
}

function recentFormLine(name: string, recentGames: RecentGame[]): string {
  if (recentGames.length === 0) {
    return `${name}: no recent games available`
  }
  const results = recentGames
    .slice(0, 5)
    .map(
      g =>
        `${g.result} ${g.pointsFor}-${g.pointsAgainst} vs ${g.opponent} (wk ${g.week})`
    )
    .join(', ')
  return `${name}: ${results}`
}

function recentFormSection(entry: PromptGame): string {
  const { game, pregame } = entry
  if (!pregame) {
    return 'Recent form: not available'
  }
  return (
    'Recent form (last 5 games, most recent first):\n' +
    `${recentFormLine(game.home.name, pregame.home.recentGames)}\n` +
    `${recentFormLine(game.away.name, pregame.away.recentGames)}`
  )
}

function restLine(
  name: string,
  recentGames: RecentGame[],
  kickoff: string
): string {
  if (recentGames.length === 0) {
    return `${name}: rest not available`
  }
  const days = daysBetween(recentGames[0].dateTime, kickoff)
  const note =
    days >= 9 ? ' (extended rest / bye)' : days <= 4 ? ' (short week)' : ''
  return `${name}: ${days} days rest${note}`
}

function restSection(entry: PromptGame): string {
  const { game, pregame } = entry
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
    .map(
      i =>
        `${i.player} (${i.position}) - ${i.status}${i.detail ? `, ${i.detail}` : ''}`
    )
    .join('; ')
  return `${name}: ${rows}`
}

function injuriesSection(entry: PromptGame): string {
  const { game, pregame } = entry
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
  const { leagueAverages } = input
  if (!leagueAverages) {
    return 'League averages: not available'
  }
  const season = input.games[0].game.season
  const note =
    leagueAverages.season !== season ? ` (${leagueAverages.season} season)` : ''
  return (
    `League averages${note}: ${leagueAverages.avgPointsPerTeam} points/team/game, ` +
    `${leagueAverages.avgTotalPoints} combined points/game — use this to judge whether ` +
    'a team or matchup is running hot or cold relative to the league.'
  )
}

function linesSection(entry: PromptGame, playerProps: boolean): string {
  const { game, odds } = entry
  if (!odds) {
    return (
      'Betting lines: NOT AVAILABLE. Any spread, total, or moneyline leg is therefore an estimate: ' +
      'say so explicitly in its reasoning and keep its confidence at or below 0.6. ' +
      // Without this the model has answered "no line" with odds: 0, which is not
      // a price at all, and validate then rejected the entire draft. An estimate
      // is what this branch is asking for, so ask for it in full.
      'You must still give every leg a realistic American price — around -110 for ' +
      'a near-even market — never 0 and never a value between -99 and +99, which ' +
      `are not valid American odds.${
        playerProps ? '' : ' Player props are not available on this plan.'
      }`
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
  return `Betting lines from ${odds.bookmaker} (updated ${odds.lastUpdate}):\n${rows.join('\n')}`
}

function gameBlock(
  entry: PromptGame,
  input: PromptInput,
  index: number
): string {
  const { game } = entry
  const heading =
    input.games.length === 1
      ? `${game.away.name} @ ${game.home.name} — Week ${game.week}, ${game.season} season, kickoff ${formatKickoff(game.dateTime)} ET.`
      : `GAME ${index + 1} of ${input.games.length}: ${game.away.name} @ ${game.home.name} — kickoff ${formatKickoff(game.dateTime)} ET.`
  return [
    heading,
    venueLine(game),
    weatherLine(game),
    `Records: ${game.home.name} ${game.home.record} (home ${game.home.homeRecord}); ${game.away.name} ${game.away.record} (road ${game.away.roadRecord}).`,
    '',
    statsSection(entry),
    '',
    epaSection(entry),
    '',
    recentFormSection(entry),
    '',
    restSection(entry),
    '',
    injuriesSection(entry),
    '',
    linesSection(entry, input.playerProps),
  ].join('\n')
}

export function buildParlayPrompt(input: PromptInput): string {
  const { games, riskLevel, legCount, playerProps } = input
  const multi = games.length > 1
  const first = games[0].game
  const task = multi
    ? `Generate ONE ${legCount}-leg NFL parlay drawing on ${games.length} games from Week ${first.week}, ${first.season} season. The legs may come from any of them, in any distribution.`
    : `Generate a ${legCount}-leg NFL parlay for ${first.away.name} @ ${first.home.name} — Week ${first.week}, ${first.season} season, kickoff ${formatKickoff(first.dateTime)} ET.`

  const teamNames = games
    .flatMap(({ game }) => [game.home.name, game.away.name])
    .map(n => `"${n}"`)
    .join(', ')

  return [
    task,
    '',
    ...games.flatMap((entry, i) => [gameBlock(entry, input, i), '']),
    leagueAverageSection(input),
    '',
    'LINE RULES: your line and price for a spread/total/moneyline leg will be automatically replaced with the exact number ' +
      "shown for that leg's game before this parlay is shown — focus on picking the right team/side and writing reasoning " +
      "consistent with the book's actual number, not on matching the price exactly. " +
      `Do not create a spread, total, or moneyline leg for a market marked NOT AVAILABLE. ${
        playerProps
          ? 'Use a player prop instead. Player props have no lines provided: set a realistic line and price yourself and keep confidence modest.'
          : // Without props there is nothing to substitute, so the orchestrator
            // reduces the leg count to the markets that do have a posted line
            // rather than asking for a leg that cannot be anchored.
            'Player props are not available on this plan — every leg must come from a market with a posted line above.'
      }`,
    '',
    `Risk level: ${riskLevel}. ${(playerProps ? RISK_GUIDANCE : RISK_GUIDANCE_NO_PROPS)[riskLevel]}`,
    '',
    'Analysis requirements:',
    `- analysisSummary.games: exactly ${games.length} entr${games.length === 1 ? 'y' : 'ies'}, one per game above, in the same order.`,
    `  - matchupSummary: ${multi ? '3-4' : '5-7'} sentences citing that game's data.`,
    '  - keyFactors: 3-5 short factors driving your read on that game (recent form, injuries, rest, and league-average context are all fair game alongside the season stats).',
    "  - gamePrediction: winner (exact team name), a projected score, and the winner's win probability — form this read before you pick legs, and keep the legs consistent with it.",
    multi
      ? '- slateSummary: 2-3 sentences on how these games fit together as one parlay, including any correlation between them.'
      : '- slateSummary: null. There is only one game, so there is nothing to summarize across games.',
    '',
    'Leg requirements:',
    '- Every leg must cite specific numbers from the data above in its reasoning (2-3 sentences).',
    multi
      ? '- No contradictory legs: within any ONE game, at most one spread leg, one total leg, and one moneyline leg, and never both sides of a market. Across different games these limits do not apply — a spread in each of two games is fine.'
      : '- No contradictory legs: at most one spread leg, one total leg, and one moneyline leg; never both sides of a market.',
    `- "team" must be exactly one of: ${teamNames} (for a total, use the team the leg leans on). The team is what tells us which game a leg belongs to, so it must be exact.`,
    '- "player": for a player_* bet type, the player\'s full name exactly as it would appear in an NFL box score (e.g. "Patrick Mahomes"); null for every other bet type.',
    '- "line": for a spread, the chosen team\'s spread from that team\'s perspective (negative = favorite); for a total or player prop, the threshold number; null for a moneyline or anytime/first TD.',
    '- "side": "over" or "under" for totals and yardage/reception props; null otherwise.',
    '- "odds": American price as an integer (e.g. -110, 145).',
    '- "selection": a short human-readable description, e.g. "Chiefs -3.5", "Over 44.5", "Patrick Mahomes Over 262.5 Passing Yards".',
    `- Available bet types: ${BetTypeEnum.options.join(', ')}.`,
    "- EDGE RULE: for a spread, total, or moneyline leg (these get anchored to the exact book price above), your confidence must be strictly greater than that price's break-even win rate (e.g. -150 breaks even at 60%, +130 at ~43%) — if you don't believe a market leg clears its own price, pick a different leg instead; it will be rejected otherwise. Player props (no posted price) are exempt — set their confidence honestly.",
    "- CORRELATION: avoid stacking legs whose outcomes move together (e.g. a team's spread, that team's QB Over passing yards, and the game Over all tend to hit or miss as a group) — a parlay built entirely from correlated pieces overstates the real combined probability. Prefer at least one leg that's largely independent of the others, or say so in your reasoning if you stack anyway.",
  ].join('\n')
}
