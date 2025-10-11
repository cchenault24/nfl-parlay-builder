import {
  BetType,
  Game,
  GameData,
  GeneratedParlay,
  PFRTeamStats,
} from '../types'

/**
 * Mock parlay generator for development and testing
 * Provides deterministic mock data based on game ID for consistent testing
 */
export class ParlayMock {
  // Constants for realistic NFL stat ranges
  private static readonly STAT_RANGES = {
    passingYards: { min: 200, max: 300 },
    rushingYards: { min: 80, max: 140 },
    pointsPerGame: { min: 18, max: 32 },
    yardsAllowed: { min: 300, max: 400 },
    pointsAllowed: { min: 16, max: 28 },
    takeaways: { min: 15, max: 25 },
    teamRank: { min: 1, max: 32 },
    confidence: { min: 0.6, max: 0.9 },
    odds: { min: 1.5, max: 2.0 },
  } as const

  /**
   * Generate a mock parlay for the given game
   * Uses deterministic seeding based on game ID for consistent results
   */
  static generateMockParlay(game: Game): GeneratedParlay {
    // Create a simple hash from game ID for deterministic seeding
    const seed = this.hashString(game.gameId)
    const random = this.seededRandom(seed)

    // Generate mock legs based on game data
    const legs = this.generateMockLegs(game, random)

    // Calculate combined odds
    const combinedOdds = legs.reduce((acc, leg) => acc * leg.odds, 1)

    // Generate game summary
    const gameSummary = this.generateMockGameSummary(game, random)

    return {
      parlayId: `mock-${game.gameId}-${Date.now()}`,
      gameId: game.gameId,
      gameContext: `${game.away.name} @ ${game.home.name} - Week ${game.week}`,
      legs,
      combinedOdds: Math.round(combinedOdds * 100) / 100,
      parlayConfidence:
        Math.round(
          (this.STAT_RANGES.confidence.min +
            random() *
              (this.STAT_RANGES.confidence.max -
                this.STAT_RANGES.confidence.min)) *
            100
        ) / 100,
      gameSummary,
    }
  }

  /**
   * Generate mock game data for the given game
   */
  static generateMockGameData(game: Game): GameData {
    const seed = this.hashString(game.gameId)
    const random = this.seededRandom(seed)

    return {
      gameId: game.gameId,
      week: game.week,
      dateTime: game.dateTime,
      status: game.status,
      home: {
        teamId: game.home.teamId,
        name: game.home.name,
        abbrev: game.home.abbrev,
        record: game.home.record,
        overallRecord: game.home.overallRecord,
        homeRecord: game.home.homeRecord,
        roadRecord: game.home.roadRecord,
        stats: this.generateMockTeamStats(
          game.home.teamId,
          game.home.name,
          game.week,
          random,
          game.home.record
        ),
        roster: this.generateMockRoster(game.home.name, random),
      },
      away: {
        teamId: game.away.teamId,
        name: game.away.name,
        abbrev: game.away.abbrev,
        record: game.away.record,
        overallRecord: game.away.overallRecord,
        homeRecord: game.away.homeRecord,
        roadRecord: game.away.roadRecord,
        stats: this.generateMockTeamStats(
          game.away.teamId,
          game.away.name,
          game.week,
          random,
          game.away.record
        ),
        roster: this.generateMockRoster(game.away.name, random),
      },
      venue: game.venue,
      leaders: game.leaders,
    }
  }

  /**
   * Generate mock parlay legs
   */
  private static generateMockLegs(
    game: Game,
    random: () => number
  ): Array<{
    betType: BetType
    selection: string
    odds: number
    confidence: number
    reasoning: string
    team: string
  }> {
    const legs = []
    const betTypes: BetType[] = [
      'spread',
      'total',
      'player_passing_yards',
      'player_rushing_yards',
      'player_receiving_yards',
    ]

    // Generate 3 legs
    for (let i = 0; i < 3; i++) {
      const betType = betTypes[Math.floor(random() * betTypes.length)]
      const isHomeTeam = random() > 0.5
      const team = isHomeTeam ? game.home : game.away
      const teamName = team.name

      let selection = ''
      let odds = 0
      let reasoning = ''

      switch (betType) {
        case 'spread': {
          const spread = (random() * 14 - 7).toFixed(1) // -7 to +7
          selection = `${teamName} ${parseFloat(spread) > 0 ? '+' : ''}${spread}`
          odds = this.randomInRange(random, 1.9, 2.0)
          reasoning = `${teamName} has been ${parseFloat(spread) > 0 ? 'strong' : 'struggling'} at home this season`
          break
        }

        case 'total': {
          const total = Math.floor(40 + random() * 20) // 40-60
          selection = `Over ${total}`
          odds = this.randomInRange(random, 1.85, 2.0)
          reasoning = `Both teams have been scoring well, expect a high-scoring game`
          break
        }

        case 'player_passing_yards': {
          const qbYards = Math.floor(200 + random() * 150) // 200-350
          selection = `Over ${qbYards} passing yards`
          odds = this.randomInRange(random, 1.8, 2.0)
          reasoning = `${teamName} QB has been throwing well against similar defenses`
          break
        }

        case 'player_rushing_yards': {
          const rbYards = Math.floor(80 + random() * 70) // 80-150
          selection = `Over ${rbYards} rushing yards`
          odds = this.randomInRange(random, 1.75, 2.0)
          reasoning = `${teamName} running back has been consistent in recent games`
          break
        }

        case 'player_receiving_yards': {
          const wrYards = Math.floor(60 + random() * 80) // 60-140
          selection = `Over ${wrYards} receiving yards`
          odds = this.randomInRange(random, 1.8, 2.0)
          reasoning = `${teamName} receiver has been a reliable target in the red zone`
          break
        }

        default:
          selection = `${teamName} to win`
          odds = this.randomInRange(
            random,
            this.STAT_RANGES.odds.min,
            this.STAT_RANGES.odds.max
          )
          reasoning = `${teamName} has the advantage in this matchup`
      }

      legs.push({
        betType,
        selection,
        odds: Math.round(odds * 100) / 100,
        confidence: Math.round((0.6 + random() * 0.3) * 100) / 100, // 60-90%
        reasoning,
        team: teamName,
      })
    }

    return legs
  }

  /**
   * Generate mock game summary
   */
  private static generateMockGameSummary(
    game: Game,
    random: () => number
  ): {
    matchupSummary: string
    keyFactors: string[]
    gamePrediction: {
      winner: string
      projectedScore: { home: number; away: number }
      winProbability: number
    }
  } {
    const homeScore = Math.floor(14 + random() * 28) // 14-42
    const awayScore = Math.floor(14 + random() * 28) // 14-42
    const winner = homeScore > awayScore ? game.home.name : game.away.name
    const winProbability =
      homeScore > awayScore ? 0.6 + random() * 0.3 : 0.3 + random() * 0.4

    const keyFactors = [
      `${game.home.name} home field advantage`,
      `${game.away.name} recent form`,
      'Weather conditions favor passing game',
      'Key injuries affecting both teams',
    ]

    return {
      matchupSummary: `A competitive matchup between ${game.away.name} and ${game.home.name} in Week ${game.week}. Both teams have shown strong performances this season, making this an intriguing contest.`,
      keyFactors,
      gamePrediction: {
        winner,
        projectedScore: { home: homeScore, away: awayScore },
        winProbability: Math.round(winProbability * 100) / 100,
      },
    }
  }

  /**
   * Generate mock roster
   */
  private static generateMockRoster(
    teamName: string,
    random: () => number
  ): Array<{
    playerId: string
    name: string
    position?: string
  }> {
    const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P']
    const roster = []

    for (let i = 0; i < 25; i++) {
      const position = positions[Math.floor(random() * positions.length)]
      const firstName = this.getRandomFirstName(random)
      const lastName = this.getRandomLastName(random)

      roster.push({
        playerId: `mock-${teamName.toLowerCase().replace(/\s+/g, '-')}-${i}`,
        name: `${firstName} ${lastName}`,
        position,
      })
    }

    return roster
  }

  /**
   * Generate a random number within a range
   */
  private static randomInRange(
    random: () => number,
    min: number,
    max: number
  ): number {
    return Math.floor(min + random() * (max - min))
  }

  /**
   * Simple hash function for deterministic seeding
   */
  private static hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Seeded random number generator
   */
  private static seededRandom(seed: number): () => number {
    let state = seed
    return () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
  }

  /**
   * Get random first name
   */
  private static getRandomFirstName(random: () => number): string {
    const names = [
      'John',
      'Mike',
      'David',
      'Chris',
      'James',
      'Robert',
      'William',
      'Richard',
      'Thomas',
      'Charles',
      'Daniel',
      'Matthew',
      'Anthony',
      'Mark',
      'Donald',
      'Steven',
      'Paul',
      'Andrew',
      'Joshua',
      'Kenneth',
      'Kevin',
      'Brian',
      'George',
      'Timothy',
      'Ronald',
      'Jason',
      'Edward',
      'Jeffrey',
      'Ryan',
      'Jacob',
    ]
    return names[Math.floor(random() * names.length)]
  }

  /**
   * Get random last name
   */
  private static getRandomLastName(random: () => number): string {
    const names = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Hernandez',
      'Lopez',
      'Gonzalez',
      'Wilson',
      'Anderson',
      'Thomas',
      'Taylor',
      'Moore',
      'Jackson',
      'Martin',
      'Lee',
      'Perez',
      'Thompson',
      'White',
      'Harris',
      'Sanchez',
      'Clark',
      'Ramirez',
      'Lewis',
      'Robinson',
    ]
    return names[Math.floor(random() * names.length)]
  }

  /**
   * Generate mock team stats for GameStatsPanel
   */
  private static generateMockTeamStats(
    teamId: string,
    teamName: string,
    week: number,
    random: () => number,
    record: string
  ): PFRTeamStats {
    // Generate realistic NFL stats
    const generateOffensiveStats = () => {
      const passingYards = this.randomInRange(
        random,
        this.STAT_RANGES.passingYards.min,
        this.STAT_RANGES.passingYards.max
      )
      const rushingYards = this.randomInRange(
        random,
        this.STAT_RANGES.rushingYards.min,
        this.STAT_RANGES.rushingYards.max
      )
      const totalYards = passingYards + rushingYards
      const pointsPerGame = this.randomInRange(
        random,
        this.STAT_RANGES.pointsPerGame.min,
        this.STAT_RANGES.pointsPerGame.max
      )

      return {
        totalYards,
        passingYards,
        rushingYards,
        pointsPerGame,
        // Generate realistic rankings (1-32)
        totalYardsRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
        passingYardsRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
        rushingYardsRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
        pointsScoredRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
        overallRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
      }
    }

    const generateDefensiveStats = () => {
      const totalYardsAllowed = this.randomInRange(
        random,
        this.STAT_RANGES.yardsAllowed.min,
        this.STAT_RANGES.yardsAllowed.max
      )
      const pointsAllowed = this.randomInRange(
        random,
        this.STAT_RANGES.pointsAllowed.min,
        this.STAT_RANGES.pointsAllowed.max
      )
      const takeaways = this.randomInRange(
        random,
        this.STAT_RANGES.takeaways.min,
        this.STAT_RANGES.takeaways.max
      )

      return {
        totalYardsAllowed,
        pointsAllowed,
        takeaways,
        // Generate realistic rankings (1-32)
        totalYardsAllowedRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
        pointsAllowedRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
        turnoversRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
        overallRank: this.randomInRange(
          random,
          this.STAT_RANGES.teamRank.min,
          this.STAT_RANGES.teamRank.max
        ),
      }
    }

    const offense = generateOffensiveStats()
    const defense = generateDefensiveStats()
    const overallTeamRank = this.randomInRange(
      random,
      this.STAT_RANGES.teamRank.min,
      this.STAT_RANGES.teamRank.max
    )

    return {
      teamId,
      teamName,
      season: new Date().getFullYear(),
      week,
      record,
      overallRecord: '0-0',
      homeRecord: '0-0',
      roadRecord: '0-0',
      offense: {
        rankings: {
          totalYardsRank: offense.totalYardsRank,
          passingYardsRank: offense.passingYardsRank,
          rushingYardsRank: offense.rushingYardsRank,
          pointsScoredRank: offense.pointsScoredRank,
          overallRank: offense.overallRank,
        },
        values: {
          totalYards: offense.totalYards,
          passingYards: offense.passingYards,
          rushingYards: offense.rushingYards,
          pointsPerGame: offense.pointsPerGame,
        },
      },
      defense: {
        rankings: {
          totalYardsAllowedRank: defense.totalYardsAllowedRank,
          pointsAllowedRank: defense.pointsAllowedRank,
          turnoversRank: defense.turnoversRank,
          overallRank: defense.overallRank,
        },
        values: {
          totalYardsAllowed: defense.totalYardsAllowed,
          pointsAllowed: defense.pointsAllowed,
          takeaways: defense.takeaways,
        },
      },
      overallOffenseRank: offense.overallRank,
      overallDefenseRank: defense.overallRank,
      overallTeamRank,
      specialTeamsRank: this.randomInRange(
        random,
        this.STAT_RANGES.teamRank.min,
        this.STAT_RANGES.teamRank.max
      ),
    }
  }
}
