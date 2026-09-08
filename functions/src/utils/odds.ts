export function americanToDecimal(odds: number): number {
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1
}

export function decimalToAmerican(decimal: number): number {
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1))
}

export function combineAmericanOdds(odds: number[]): number {
  return decimalToAmerican(
    odds.reduce((acc, o) => acc * americanToDecimal(o), 1)
  )
}

export function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : String(odds)
}
