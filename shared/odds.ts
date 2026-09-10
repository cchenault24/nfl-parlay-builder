export const formatOdds = (odds: number): string =>
  odds > 0 ? `+${odds}` : String(odds)

// The break-even win rate a price implies — e.g. -150 implies 60%. A leg
// whose stated confidence doesn't clear this isn't +EV even if it hits more
// often than not.
export const impliedProbability = (americanOdds: number): number =>
  americanOdds > 0
    ? 100 / (americanOdds + 100)
    : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
