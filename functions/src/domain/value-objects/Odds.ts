/**
 * Odds value object
 * Represents betting odds with validation and conversion logic
 */
export class Odds {
  private readonly _value: string

  constructor(odds: string) {
    this._value = this.validateAndNormalize(odds)
  }

  /**
   * Validate and normalize odds string
   */
  private validateAndNormalize(odds: string): string {
    if (!odds || typeof odds !== 'string') {
      throw new Error('Odds must be a non-empty string')
    }

    // Remove whitespace and normalize
    const normalized = odds.trim()

    // Check if it's in American format (+100, -150, etc.)
    if (/^[+-]?\d+$/.test(normalized)) {
      const num = parseInt(normalized, 10)
      if (num === 0) {
        throw new Error('Odds cannot be zero')
      }
      return normalized
    }

    // Check if it's in decimal format (2.50, 1.67, etc.)
    if (/^\d+\.\d+$/.test(normalized)) {
      const num = parseFloat(normalized)
      if (num <= 1.0) {
        throw new Error('Decimal odds must be greater than 1.0')
      }
      return normalized
    }

    // Check if it's in fractional format (3/2, 5/4, etc.)
    if (/^\d+\/\d+$/.test(normalized)) {
      const [numerator, denominator] = normalized.split('/').map(Number)
      if (denominator === 0) {
        throw new Error('Fractional odds denominator cannot be zero')
      }
      if (numerator <= 0 || denominator <= 0) {
        throw new Error('Fractional odds must have positive numbers')
      }
      return normalized
    }

    throw new Error(
      'Invalid odds format. Use American (+100), decimal (2.50), or fractional (3/2) format'
    )
  }

  /**
   * Get the raw odds value
   */
  public getValue(): string {
    return this._value
  }

  /**
   * Convert to American odds format
   */
  public toAmerican(): string {
    if (/^[+-]?\d+$/.test(this._value)) {
      return this._value
    }

    if (/^\d+\.\d+$/.test(this._value)) {
      const decimal = parseFloat(this._value)
      if (decimal >= 2.0) {
        return `+${Math.round((decimal - 1) * 100)}`
      } else {
        return `${Math.round(-100 / (decimal - 1))}`
      }
    }

    if (/^\d+\/\d+$/.test(this._value)) {
      const [numerator, denominator] = this._value.split('/').map(Number)
      const decimal = numerator / denominator + 1
      if (decimal >= 2.0) {
        return `+${Math.round((decimal - 1) * 100)}`
      } else {
        return `${Math.round(-100 / (decimal - 1))}`
      }
    }

    throw new Error('Unable to convert odds to American format')
  }

  /**
   * Convert to decimal odds format
   */
  public toDecimal(): number {
    if (/^[+-]?\d+$/.test(this._value)) {
      const american = parseInt(this._value, 10)
      if (american > 0) {
        return american / 100 + 1
      } else {
        return 100 / Math.abs(american) + 1
      }
    }

    if (/^\d+\.\d+$/.test(this._value)) {
      return parseFloat(this._value)
    }

    if (/^\d+\/\d+$/.test(this._value)) {
      const [numerator, denominator] = this._value.split('/').map(Number)
      return numerator / denominator + 1
    }

    throw new Error('Unable to convert odds to decimal format')
  }

  /**
   * Convert to fractional odds format
   */
  public toFractional(): string {
    if (/^\d+\/\d+$/.test(this._value)) {
      return this._value
    }

    const decimal = this.toDecimal()
    const fractional = decimal - 1
    const numerator = Math.round(fractional * 100)
    const denominator = 100

    // Simplify the fraction
    const gcd = this.gcd(numerator, denominator)
    return `${numerator / gcd}/${denominator / gcd}`
  }

  /**
   * Calculate implied probability
   */
  public getImpliedProbability(): number {
    const decimal = this.toDecimal()
    return 1 / decimal
  }

  /**
   * Calculate payout for a given stake
   */
  public calculatePayout(stake: number): number {
    const decimal = this.toDecimal()
    return stake * decimal
  }

  /**
   * Calculate profit for a given stake
   */
  public calculateProfit(stake: number): number {
    return this.calculatePayout(stake) - stake
  }

  /**
   * Check if odds are positive (underdog)
   */
  public isPositive(): boolean {
    if (/^[+-]?\d+$/.test(this._value)) {
      return parseInt(this._value, 10) > 0
    }
    return this.toDecimal() > 2.0
  }

  /**
   * Check if odds are negative (favorite)
   */
  public isNegative(): boolean {
    return !this.isPositive()
  }

  /**
   * Get odds as a display string
   */
  public toString(): string {
    return this._value
  }

  /**
   * Check if odds are equal to another
   */
  public equals(other: Odds): boolean {
    return this.toDecimal() === other.toDecimal()
  }

  /**
   * Compare odds (returns -1, 0, or 1)
   */
  public compareTo(other: Odds): number {
    const thisDecimal = this.toDecimal()
    const otherDecimal = other.toDecimal()

    if (thisDecimal < otherDecimal) return -1
    if (thisDecimal > otherDecimal) return 1
    return 0
  }

  /**
   * Calculate greatest common divisor
   */
  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b)
  }

  /**
   * Create odds from American format
   */
  public static fromAmerican(american: number): Odds {
    return new Odds(american.toString())
  }

  /**
   * Create odds from decimal format
   */
  public static fromDecimal(decimal: number): Odds {
    return new Odds(decimal.toFixed(2))
  }

  /**
   * Create odds from fractional format
   */
  public static fromFractional(numerator: number, denominator: number): Odds {
    return new Odds(`${numerator}/${denominator}`)
  }
}
