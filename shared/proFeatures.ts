import type { TierCapabilities } from './tiering'

// What Pro gives you, written from the capabilities the server actually sends.
//
// Both clients used to carry this as six English sentences with the numbers
// spelled into them — "Parlays from 2 to 6 legs" — which meant widening a limit
// server-side left a paid feature unadvertised on both platforms, and left the
// upgrade sheet describing a product that no longer existed. The numbers now
// come from the same payload that enforces them.
//
// Order is deliberate: the weekly limit is what most people hit first, and props
// are the strongest hook.
export function proFeatures(
  pro: TierCapabilities,
  current?: TierCapabilities
): string[] {
  const features: string[] = []

  if (pro.generationsPerWeek === null) {
    const limit = current?.generationsPerWeek
    features.push(
      limit == null
        ? 'Unlimited parlays — no weekly limit'
        : `Unlimited parlays — no ${limit}-a-week limit`
    )
  }

  if (pro.playerProps) {
    features.push('Player props, on top of the game markets')
  }

  if (pro.riskLevels.length > 1) {
    features.push(`${listOf(pro.riskLevels)} risk levels`)
  }

  if (pro.legCount.max > pro.legCount.min) {
    features.push(`Parlays from ${pro.legCount.min} to ${pro.legCount.max} legs`)
  }

  if (pro.chooseSportsbook) {
    features.push('Price every leg on your own sportsbook')
  }

  if (pro.maxGamesPerRun > 1) {
    features.push(`Cross-game parlays, up to ${pro.maxGamesPerRun} games at once`)
  }

  if (pro.historyDepth === null) {
    features.push('Your full history, every season, with win rate and ROI')
  }

  return features
}

// "Conservative, moderate and aggressive" — sentence case, since this opens a
// line rather than labelling a control.
function listOf(values: string[]): string {
  if (values.length <= 1) {
    return sentenceCase(values[0] ?? '')
  }
  const head = values.slice(0, -1)
  const tail = values[values.length - 1]
  return `${[sentenceCase(head[0]), ...head.slice(1)].join(', ')} and ${tail}`
}

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
