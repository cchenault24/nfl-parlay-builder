export type OddsSnapshot = {
  moneylineHome: number
  moneylineAway: number
  totalPoints: number
  spreadHome: number
}

// Stubbed odds snapshot; in prod, source from provider and cache
export async function fetchOddsForGame(_gameId: string): Promise<OddsSnapshot> {
  return {
    moneylineHome: -120,
    moneylineAway: +110,
    totalPoints: 44.5,
    spreadHome: -2.5,
  }
}
