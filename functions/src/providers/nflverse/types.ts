// EPA (expected points added) efficiency for one team, derived from
// nflverse's per-team weekly regular-season rollup.
export interface TeamEpa {
  // Offensive EPA per play: (passing_epa + rushing_epa) over dropbacks plus
  // carries. `receiving_epa` is deliberately excluded — it re-attributes the
  // same passing plays to receivers and would double-count them.
  offEpaPerPlay: number
  // The same measure for the opponents this team has faced, i.e. how much
  // offensive EPA per play its defense has given up.
  defEpaPerPlayAllowed: number
  // Offensive EPA per play over the three most recent games, for form that a
  // season-long average washes out. Null before three games have been played.
  offEpaPerPlayLast3: number | null
  plays: number
  games: number
}

export interface TeamEpaStats {
  // The season the numbers came from, which is the prior season when the
  // current one has no regular-season games yet.
  season: number
  home: TeamEpa
  away: TeamEpa
}
