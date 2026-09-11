import type { Sportsbook, TierCapabilities } from '@shared/tiering'
import type { BookLines, RiskLevel } from '@shared/types'

// The run-settings sheet, decided in one place. Which books are offered, which
// are disabled and why, and what actually goes on the wire are all rules rather
// than rendering — and getting `bookmaker` wrong on free breaks every run, so it
// is worth testing rather than reading.

export const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
]

export interface BookOption {
  key: string
  title: string
  selected: boolean
  // Disabled because this book has not posted this game. Distinct from locked,
  // which is about the plan rather than the game.
  disabled: boolean
  locked: boolean
  caption?: string
}

export interface ChoiceOption<T> {
  value: T
  label: string
  locked: boolean
}

// Free is pinned to the first book in the server's own priority order — the one
// it will start from anyway. Naming it is truthful; offering a choice that does
// not exist is not (DESIGN #19).
export function pinnedBookKey(sportsbooks: Sportsbook[]): string | undefined {
  return sportsbooks[0]?.key
}

// What a book has posted for one game, or undefined while the week's lines are
// still loading — in which case nothing is disabled, because nothing is known.
function postedLookup(lines: BookLines[] | undefined): (key: string) => boolean {
  return key => (lines ? (lines.find(b => b.key === key)?.posted ?? false) : true)
}

export function bookOptions(params: {
  sportsbooks: Sportsbook[]
  capabilities: TierCapabilities | undefined
  chosen: string | undefined
  lines: BookLines[] | undefined
}): BookOption[] {
  const { sportsbooks, capabilities, lines } = params
  const canChoose = capabilities?.chooseSportsbook ?? false
  const posted = postedLookup(lines)
  const effective = effectiveBookKey(params)

  return sportsbooks.map(book => ({
    key: book.key,
    title: book.title,
    selected: book.key === effective,
    // A free user's locked books are not also marked unavailable: they cannot
    // pick one either way, and two reasons for one refusal reads as noise.
    disabled: canChoose && !posted(book.key),
    locked: !canChoose && book.key !== pinnedBookKey(sportsbooks),
    caption: canChoose && !posted(book.key) ? 'Not available' : undefined,
  }))
}

// The book the sheet should show as selected. Free is pinned. Pro gets its
// choice when that book has posted this game, and otherwise falls to the next
// one in priority order that has — mirroring what the server would do, so the
// sheet never shows a selection the run will not honour (DESIGN #21).
export function effectiveBookKey(params: {
  sportsbooks: Sportsbook[]
  capabilities: TierCapabilities | undefined
  chosen: string | undefined
  lines: BookLines[] | undefined
}): string | undefined {
  const { sportsbooks, capabilities, chosen, lines } = params
  if (!(capabilities?.chooseSportsbook ?? false)) {
    return pinnedBookKey(sportsbooks)
  }
  const posted = postedLookup(lines)
  if (chosen && posted(chosen)) {
    return chosen
  }
  return sportsbooks.find(b => posted(b.key))?.key
}

/**
 * What to put in the request's `bookmaker` field.
 *
 * Free must send **nothing**. `agent.ts` answers 403 `sportsbook_locked` to a
 * requested book when `chooseSportsbook` is false, so sending `draftkings` to
 * match the label the sheet shows would break every free run. The server's own
 * priority already starts there: the UI names the book, the server picks it.
 */
export function bookmakerForRequest(
  capabilities: TierCapabilities | undefined,
  chosen: string | undefined
): string | undefined {
  if (!(capabilities?.chooseSportsbook ?? false)) {
    return undefined
  }
  return chosen || undefined
}

export function riskOptions(
  capabilities: TierCapabilities | undefined
): ChoiceOption<RiskLevel>[] {
  // Until entitlements load, every gated control is treated as locked.
  // Defaulting the other way would briefly show an unlocked control and let a
  // tap through in the gap.
  const allowed = capabilities?.riskLevels ?? ['moderate']
  return RISK_LEVELS.map(risk => ({
    value: risk.value,
    label: risk.label,
    locked: !allowed.includes(risk.value),
  }))
}

// Every leg count the product offers, with the ones this plan cannot reach
// marked. Locked options stay visible: the conversion moment is a control the
// user already wants, not an empty state (DESIGN #8).
export function legCountOptions(
  capabilities: TierCapabilities | undefined,
  widest: { min: number; max: number } = { min: 2, max: 6 }
): ChoiceOption<number>[] {
  const allowed = capabilities?.legCount
  const counts: number[] = []
  for (let n = widest.min; n <= widest.max; n++) {
    counts.push(n)
  }
  return counts.map(value => ({
    value,
    label: String(value),
    locked: !allowed || value < allowed.min || value > allowed.max,
  }))
}

// What the settings row says without opening the sheet.
export function settingsSummary(params: {
  riskLevel: RiskLevel
  legCount: number
  bookTitle: string | undefined
}): string {
  const risk = RISK_LEVELS.find(r => r.value === params.riskLevel)?.label ?? 'Moderate'
  return [risk, `${params.legCount} legs`, params.bookTitle]
    .filter(Boolean)
    .join(' · ')
}

export function effectiveLegCount(
  capabilities: TierCapabilities | undefined,
  chosen: number | undefined
): number {
  const allowed = capabilities?.legCount
  if (!allowed) {
    return chosen ?? 3
  }
  if (chosen === undefined) {
    return allowed.default
  }
  return Math.min(Math.max(chosen, allowed.min), allowed.max)
}
