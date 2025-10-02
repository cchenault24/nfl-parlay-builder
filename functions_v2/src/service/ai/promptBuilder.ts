// Define a basic game item type for PFR
interface GameItem {
  gameId: string
  week: number
  home: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: {
      offenseRankings: {
        totalYardsRank: number
        passingYardsRank: number
        rushingYardsRank: number
        pointsScoredRank: number
      }
      defenseRankings: {
        totalYardsAllowedRank: number
        pointsAllowedRank: number
        turnoversRank: number
      }
      overallOffenseRank: number
      overallDefenseRank: number
      overallTeamRank: number
      specialTeamsRank?: number
    } | null
  }
  away: {
    teamId: string
    name: string
    abbrev: string
    record: string
    overallRecord: string
    homeRecord: string
    roadRecord: string
    stats: {
      offenseRankings: {
        totalYardsRank: number
        passingYardsRank: number
        rushingYardsRank: number
        pointsScoredRank: number
      }
      defenseRankings: {
        totalYardsAllowedRank: number
        pointsAllowedRank: number
        turnoversRank: number
      }
      overallOffenseRank: number
      overallDefenseRank: number
      overallTeamRank: number
      specialTeamsRank?: number
    } | null
  }
  venue?: {
    name: string
    city: string
    state: string
  }
  status?: string
  weather?: {
    condition: string
    temperatureF: number
    windMph: number
  }
  leaders?: {
    passing?: { name: string; stats: string; value: number }
    rushing?: { name: string; stats: string; value: number }
    receiving?: { name: string; stats: string; value: number }
  }
  dateTime?: string
}
import { BetTypeEnum } from './schemas'

// All available bet types - will be filtered by gameData.betType in the future
const ALL_BET_TYPES = BetTypeEnum.options

function getAvailableBetTypes(_gameData: GameItem): string {
  return ALL_BET_TYPES.join(', ')
}

function getRiskLevelGuidance(
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
): string {
  switch (riskLevel) {
    case 'conservative':
      return 'Focus on safer bets with higher probability (60-75% confidence). Prefer spreads, totals, and established player props. Avoid long-shot bets.'
    case 'moderate':
      return 'Balance between safety and value. Mix of spreads, totals, and player props with 50-70% confidence. Include some moderate risk/reward bets.'
    case 'aggressive':
      return 'Higher risk/reward bets acceptable. Include player props, anytime TDs, and longer odds. Confidence can range 40-65% for higher payout potential.'
    default:
      return 'Balance safety with value in your selections.'
  }
}

function buildGameContext(gameData: GameItem): string {
  let context =
    `\nGame Context:` +
    `\n- Away Team: ${gameData.away.name} (${gameData.away.abbrev}) - Record: ${gameData.away.overallRecord} (Home: ${gameData.away.homeRecord}, Road: ${gameData.away.roadRecord})` +
    `\n- Home Team: ${gameData.home.name} (${gameData.home.abbrev}) - Record: ${gameData.home.overallRecord} (Home: ${gameData.home.homeRecord}, Road: ${gameData.home.roadRecord})` +
    `\n- Venue: ${gameData.venue ? `${gameData.venue.name}, ${gameData.venue.city}, ${gameData.venue.state}` : 'Not available'}` +
    `\n- Week: ${gameData.week}` +
    `\n- Game Status: ${gameData.status}` +
    `\n- Weather: ${gameData.weather ? `${gameData.weather.condition}, ${gameData.weather.temperatureF}°F, ${gameData.weather.windMph} mph winds` : 'Not available'}` +
    `\n- Game Leaders: ${
      gameData.leaders
        ? `Passing: ${gameData.leaders.passing?.name || 'N/A'} (${gameData.leaders.passing?.stats || 'N/A'}), ` +
          `Rushing: ${gameData.leaders.rushing?.name || 'N/A'} (${gameData.leaders.rushing?.stats || 'N/A'}), ` +
          `Receiving: ${gameData.leaders.receiving?.name || 'N/A'} (${gameData.leaders.receiving?.stats || 'N/A'})`
        : 'Not available'
    }`

  // Add detailed team statistics if available
  if (gameData.home.stats && gameData.away.stats) {
    const homeStats = gameData.home.stats
    const awayStats = gameData.away.stats

    // PFR format - simplified to only ranks
    const getOffenseStats = (stats: GameItem['home']['stats']) => ({
      totalYards: {
        rank: stats?.offenseRankings.totalYardsRank || 0,
        yardsPerGame: 0,
      },
      passingYards: {
        rank: stats?.offenseRankings.passingYardsRank || 0,
        yardsPerGame: 0,
      },
      rushingYards: {
        rank: stats?.offenseRankings.rushingYardsRank || 0,
        yardsPerGame: 0,
      },
      pointsScored: {
        rank: stats?.offenseRankings.pointsScoredRank || 0,
        yardsPerGame: 0,
      },
    })

    const getDefenseStats = (stats: GameItem['home']['stats']) => ({
      pointsAllowed: {
        rank: stats?.defenseRankings.pointsAllowedRank || 0,
        yardsPerGame: 0,
      },
      totalYardsAllowed: {
        rank: stats?.defenseRankings.totalYardsAllowedRank || 0,
        yardsPerGame: 0,
      },
      turnovers: { rank: stats?.defenseRankings.turnoversRank || 0, total: 0 },
    })

    const homeOffense = getOffenseStats(homeStats)
    const homeDefense = getDefenseStats(homeStats)
    const awayOffense = getOffenseStats(awayStats)
    const awayDefense = getDefenseStats(awayStats)

    context +=
      `\n\nDetailed Team Statistics:` +
      `\n\nHome Team (${gameData.home.name}) Season Performance:` +
      `\n- Offensive Rankings: Total Yards #${homeOffense.totalYards.rank} (${homeOffense.totalYards.yardsPerGame.toFixed(1)} YPG), ` +
      `Passing #${homeOffense.passingYards.rank} (${homeOffense.passingYards.yardsPerGame.toFixed(1)} YPG), ` +
      `Rushing #${homeOffense.rushingYards.rank} (${homeOffense.rushingYards.yardsPerGame.toFixed(1)} YPG), ` +
      `Points #${homeOffense.pointsScored.rank} (${homeOffense.pointsScored.yardsPerGame.toFixed(1)} PPG)` +
      `\n- Defensive Rankings: Points Allowed #${homeDefense.pointsAllowed.rank} (${homeDefense.pointsAllowed.yardsPerGame.toFixed(1)} PPG), ` +
      `Total Yards Allowed #${homeDefense.totalYardsAllowed.rank} (${homeDefense.totalYardsAllowed.yardsPerGame.toFixed(1)} YPG), ` +
      `Turnovers #${homeDefense.turnovers.rank} (${homeDefense.turnovers.total} total)` +
      `\n\nAway Team (${gameData.away.name}) Season Performance:` +
      `\n- Offensive Rankings: Total Yards #${awayOffense.totalYards.rank} (${awayOffense.totalYards.yardsPerGame.toFixed(1)} YPG), ` +
      `Passing #${awayOffense.passingYards.rank} (${awayOffense.passingYards.yardsPerGame.toFixed(1)} YPG), ` +
      `Rushing #${awayOffense.rushingYards.rank} (${awayOffense.rushingYards.yardsPerGame.toFixed(1)} YPG), ` +
      `Points #${awayOffense.pointsScored.rank} (${awayOffense.pointsScored.yardsPerGame.toFixed(1)} PPG)` +
      `\n- Defensive Rankings: Points Allowed #${awayDefense.pointsAllowed.rank} (${awayDefense.pointsAllowed.yardsPerGame.toFixed(1)} PPG), ` +
      `Total Yards Allowed #${awayDefense.totalYardsAllowed.rank} (${awayDefense.totalYardsAllowed.yardsPerGame.toFixed(1)} YPG), ` +
      `Turnovers #${awayDefense.turnovers.rank} (${awayDefense.turnovers.total} total)`
  }

  return context
}

function buildAnalysisGuidance(): string {
  return (
    `\n\nProvide a comprehensive matchup analysis considering:` +
    `\n- Team records, recent form, and head-to-head history` +
    `\n- Venue factors (home field advantage, weather impact)` +
    `\n- Key player matchups and injury reports` +
    `\n- Offensive/defensive strengths and weaknesses` +
    `\n- Coaching strategies and game plan tendencies` +
    `\n- Weather conditions and their impact on gameplay` +
    `\n- Recent performance trends and momentum` +
    `\n- Statistical advantages and situational factors` +
    `\n- Player usage patterns and target distribution` +
    `\n- Defensive schemes and how they match up against offensive strengths` +
    `\n- Red zone efficiency and goal line situations` +
    `\n- Time of possession and pace of play factors`
  )
}

function buildLegGenerationRequirements(
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
): string {
  return (
    `\n\nCRITICAL REQUIREMENTS FOR PARLAY LEGS - DATA-DRIVEN SELECTION:` +
    `\n- Each leg MUST be directly supported by the specific stats and data provided above` +
    `\n- Risk level ${riskLevel}: ${getRiskLevelGuidance(riskLevel)}` +
    `\n- Base selections on the actual team records, player stats, and venue data shown` +
    `\n- Use the game leaders' performance data to inform player prop selections` +
    `\n- Consider the weather conditions and venue factors in your bet choices` +
    `\n- Match bet types to the specific strengths/weaknesses identified in the data` +
    `\n- If a team has strong home/road records, factor that into spread/total bets` +
    `\n- Use the actual player names and stats from the game leaders section` +
    `\n- Ensure all 3 legs work together based on the same analytical foundation` +
    `\n- Avoid contradictory bets (e.g., don't bet over total AND under total)` +
    `\n- Base odds on realistic expectations given the specific matchup data` +
    `\n- Confidence levels should reflect the strength of the supporting data` +
    `\n- If weather data shows wind/conditions, factor into passing/rushing bets` +
    `\n- Use venue-specific advantages (home field, altitude, etc.) in selections` +
    `\n\nSELECTION FORMAT EXAMPLES:` +
    `\n- Team bets: "Seahawks -3.5", "Bills Over 24.5 Points", "Chiefs Moneyline"` +
    `\n- Player props: "Josh Allen Over 250 Passing Yards", "Derrick Henry Under 100 Rushing Yards", "Travis Kelce Anytime TD"` +
    `\n- Game totals: "Over 47.5 Total Points", "Under 21.5 First Half Points"` +
    `\n- ALWAYS use descriptive strings, never objects or numbers for selection field`
  )
}

function buildOutputFormat(gameData: GameItem): string {
  return (
    `\n\nOutput JSON with fields: ` +
    `"legs" (array of 3) with objects {betType,selection(STRING describing the bet),odds(AS NUMBER),confidence(0..1),reasoning(2-3 sentences explaining why this bet was chosen, citing specific stats, records, or data points from the game context)} and ` +
    `"analysisSummary" {matchupSummary(detailed 5-7 sentences with comprehensive analysis),keyFactors[](3-5 specific factors),gamePrediction{winner,projectedScore{home,away},winProbability}}. ` +
    `\n\nUse these bet types: ${getAvailableBetTypes(gameData)} ` +
    `\n\nIMPORTANT: ` +
    `- odds must be numbers (e.g., -110, not "-110")` +
    `- selection must be a STRING describing the bet (e.g., "Seahawks Over 24.5 Points", "Josh Allen Over 250 Passing Yards", "Bills -3.5")` +
    `- Do NOT use objects or numbers for selection field` +
    `\n\nReturn ONLY JSON, no prose.`
  )
}

export function buildParlayPrompt(params: {
  gameData: GameItem
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
}): string {
  const { gameData, riskLevel } = params

  const startTime = gameData.dateTime
    ? new Date(gameData.dateTime).toLocaleDateString()
    : 'TBD'
  const venueName = gameData.venue?.name || 'TBD'
  const venueCity = gameData.venue?.city || 'TBD'
  const venueState = gameData.venue?.state || 'TBD'

  return `Generate a 3-leg NFL parlay for this game: ${gameData.away.name} @ ${gameData.home.name} (Week ${gameData.week}, ${startTime}) at ${venueName} in ${venueCity}, ${venueState}.${buildGameContext(gameData)}\n\nRisk level: ${riskLevel}.${buildAnalysisGuidance()}\n\nGenerate realistic betting lines and selections based on this deep analysis.${buildLegGenerationRequirements(riskLevel)}${buildOutputFormat(gameData)}`
}
