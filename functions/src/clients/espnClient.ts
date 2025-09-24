import type { GameRosters, NFLGame, NFLPlayer, NFLTeam } from '@npb/shared'
import { HttpBase } from './httpBase'

export class ESPNServerClient {
  private http: HttpBase
  constructor() {
    this.http = new HttpBase({
      baseUrl: 'https://site.api.espn.com',
      defaultTimeoutMs: 8000,
    })
  }

  async getGameDetails(
    gameId: string
  ): Promise<{ game: NFLGame; rosters: GameRosters }> {
    // Replace with your real mapping. This is a minimal stub that compiles.
    const data = await this.http.get<any>(
      `/apis/site/v2/sports/football/nfl/summary?event=${gameId}`
    )
    const game = mapGame(data)
    const rosters = mapRosters(data, gameId)
    return { game, rosters }
  }
}

function mapTeam(t: any): NFLTeam {
  return {
    id: String(t?.team?.id ?? ''),
    abbreviation: t?.team?.abbreviation ?? '',
    displayName: t?.team?.displayName ?? '',
    shortDisplayName: t?.team?.shortDisplayName ?? '',
    color: t?.team?.color,
    alternateColor: t?.team?.alternateColor,
    logo: t?.team?.logo,
  }
}

function mapGame(src: any): NFLGame {
  const comp = src?.header?.competitions?.[0]
  const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
  const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
  return {
    id: String(src?.header?.id ?? ''),
    season: Number(src?.header?.season?.year ?? 0),
    week: Number(src?.header?.week?.number ?? 0),
    date: comp?.date ?? '',
    status: normalizeStatus(comp?.status?.type?.state),
    homeTeam: mapTeam(home),
    awayTeam: mapTeam(away),
    venue: {
      name: comp?.venue?.fullName,
      city: comp?.venue?.address?.city,
      state: comp?.venue?.address?.state,
    },
  }
}

function mapRosters(src: any, gameId: string): GameRosters {
  const homePlayers: NFLPlayer[] = []
  const awayPlayers: NFLPlayer[] = []
  return { gameId, home: homePlayers, away: awayPlayers }
}

function normalizeStatus(state: string): NFLGame['status'] {
  const s = (state || '').toLowerCase()
  if (s === 'pre') return 'scheduled'
  if (s.startsWith('in')) return 'in_progress'
  if (s === 'post') return 'final'
  return 'scheduled'
}
