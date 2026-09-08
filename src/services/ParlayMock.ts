import type {
  AgentResult,
  BetType,
  Game,
  OddsSnapshot,
  ParlayLeg,
  RankedStat,
  TeamStats,
} from '../types'

// Deterministic per game so the same matchup renders the same mock every time.
function seededRandom(seed: string): () => number {
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) | 0
  }
  state = Math.abs(state) || 1
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

const between = (r: () => number, min: number, max: number) =>
  min + r() * (max - min)
const price = (r: () => number) => Math.round(between(r, -140, 130) / 5) * 5 || -110
const half = (n: number) => Math.round(n * 2) / 2

function stat(r: () => number, min: number, max: number): RankedStat {
  return {
    value: Math.round(between(r, min, max) * 10) / 10,
    rank: Math.ceil(between(r, 1, 32)),
  }
}

function teamStats(r: () => number, team: Game['home'], season: number): TeamStats {
  const offense = {
    totalYardsPerGame: stat(r, 280, 400),
    passingYardsPerGame: stat(r, 180, 280),
    rushingYardsPerGame: stat(r, 85, 150),
    pointsPerGame: stat(r, 17, 31),
  }
  const defense = {
    yardsAllowedPerGame: stat(r, 280, 400),
    passingYardsAllowedPerGame: stat(r, 180, 280),
    rushingYardsAllowedPerGame: stat(r, 85, 150),
    pointsAllowedPerGame: stat(r, 16, 29),
    takeaways: stat(r, 8, 30),
  }
  const mean = (s: RankedStat[]) =>
    Math.round(s.reduce((a, b) => a + b.rank, 0) / s.length)
  const overallOffenseRank = mean(Object.values(offense))
  const overallDefenseRank = mean(Object.values(defense))
  return {
    teamId: team.teamId,
    teamName: team.name,
    season,
    gamesPlayed: 17,
    offense,
    defense,
    overallOffenseRank,
    overallDefenseRank,
    overallRank: Math.round((overallOffenseRank + overallDefenseRank) / 2),
  }
}

export class ParlayMock {
  static generate(game: Game): {
    parlay: AgentResult['parlay']
    homeStats: TeamStats
    awayStats: TeamStats
    odds: OddsSnapshot
  } {
    const r = seededRandom(game.gameId)
    const spreadLine = half(between(r, -7, 7))
    const total = half(between(r, 39, 52))
    const odds: OddsSnapshot = {
      eventId: `mock-${game.gameId}`,
      bookmaker: 'Mock Book',
      bookmakerKey: 'mock',
      lastUpdate: new Date().toISOString(),
      spread: { line: spreadLine, homePrice: -110, awayPrice: -110 },
      total: { line: total, overPrice: -110, underPrice: -110 },
      moneyline: {
        home: spreadLine < 0 ? -160 : 135,
        away: spreadLine < 0 ? 135 : -160,
      },
    }

    const favorite = spreadLine < 0 ? game.home : game.away
    const favLine = spreadLine < 0 ? spreadLine : -spreadLine
    const propTeam = r() > 0.5 ? game.home : game.away
    const propYards = half(between(r, 230, 290))
    const legs: ParlayLeg[] = [
      {
        betType: 'spread' satisfies BetType,
        team: favorite.name,
        selection: `${favorite.name} ${favLine}`,
        line: favLine,
        side: null,
        odds: -110,
        confidence: Math.round(between(r, 0.58, 0.72) * 100) / 100,
        reasoning: `${favorite.name} is laying ${Math.abs(favLine)} points at home-field-adjusted numbers; mock data.`,
      },
      {
        betType: 'total',
        team: game.home.name,
        selection: `Over ${total}`,
        line: total,
        side: 'over',
        odds: -110,
        confidence: Math.round(between(r, 0.52, 0.68) * 100) / 100,
        reasoning: 'Both offenses project above the posted total in this mock scenario.',
      },
      {
        betType: 'player_passing_yards',
        team: propTeam.name,
        selection: `${propTeam.abbrev} QB Over ${propYards} Passing Yards`,
        line: propYards,
        side: 'over',
        odds: price(r),
        confidence: Math.round(between(r, 0.5, 0.65) * 100) / 100,
        reasoning: 'Mock player prop generated from the seeded matchup.',
      },
    ]

    const decimal = legs.reduce(
      (acc, l) => acc * (l.odds > 0 ? l.odds / 100 + 1 : 100 / Math.abs(l.odds) + 1),
      1
    )
    const combinedOdds =
      decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1))
    const homeScore = Math.round(between(r, 17, 34))
    const awayScore = Math.round(between(r, 14, 31))
    const winner = homeScore >= awayScore ? game.home : game.away

    return {
      parlay: {
        legs,
        combinedOdds,
        parlayConfidence: Math.min(...legs.map(l => l.confidence)),
        gameSummary: {
          matchupSummary: `Mock analysis for ${game.away.name} at ${game.home.name} in Week ${game.week}. Numbers here are seeded from the game id and are not real.`,
          keyFactors: [
            `${game.home.name} home record ${game.home.homeRecord}`,
            `${game.away.name} road record ${game.away.roadRecord}`,
            game.venue?.indoor ? 'Indoor venue' : 'Outdoor venue',
          ],
          gamePrediction: {
            winner: winner.name,
            projectedScore: { home: homeScore, away: awayScore },
            winProbability: Math.round(between(r, 0.55, 0.7) * 100) / 100,
          },
        },
      },
      homeStats: teamStats(r, game.home, game.season - 1),
      awayStats: teamStats(r, game.away, game.season - 1),
      odds,
    }
  }
}
