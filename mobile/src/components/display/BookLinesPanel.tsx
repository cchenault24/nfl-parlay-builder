import { formatOdds } from '@shared/odds'
import type { BookLines, Game } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

interface BookLinesPanelProps {
  game: Game
  // The book whose numbers a run would actually use, resolved the way the
  // server resolves it. Null when no book has posted this game.
  book: BookLines | null | undefined
  // Set only when the user's chosen book is not the one being shown. Free never
  // chose one, so this stays undefined there (DESIGN #20).
  fellBackFrom?: string
}

/**
 * Spread, total and moneyline before a run — the other half of what makes
 * deciding cheap. Renders nothing when nobody has posted the game: an empty
 * panel saying "—, —, —" is a worse answer than no panel.
 */
export function BookLinesPanel({ game, book, fellBackFrom }: BookLinesPanelProps) {
  if (!book?.posted) {
    return null
  }
  const { home, away } = game

  return (
    <View style={styles.panel}>
      <Text style={styles.title} accessibilityRole="header">
        Book lines · {book.title}
        {fellBackFrom ? ` (your book had no line)` : ''}
      </Text>
      <View style={styles.lines}>
        <Text style={styles.line}>
          Spread:{' '}
          {book.spread
            ? `${home.abbrev} ${formatOdds(book.spread.line)} (${formatOdds(book.spread.homePrice)})`
            : '—'}
        </Text>
        <Text style={styles.line}>
          Total:{' '}
          {book.total
            ? `${book.total.line} (O ${formatOdds(book.total.overPrice)} / U ${formatOdds(book.total.underPrice)})`
            : '—'}
        </Text>
        <Text style={styles.line}>
          Moneyline:{' '}
          {book.moneyline
            ? `${home.abbrev} ${formatOdds(book.moneyline.home)} / ${away.abbrev} ${formatOdds(book.moneyline.away)}`
            : '—'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { ...typography.label, color: colors.text },
  lines: { gap: spacing.xs },
  line: { ...typography.numericSmall, color: colors.textSecondary },
})
