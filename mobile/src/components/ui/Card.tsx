import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'

import { colors, radius, spacing } from '@/lib/theme/designTokens'

export type CardTone =
  // A top-level card on the page.
  | 'raised'
  // A block nested inside a `raised` card. It borrows the page colour so the
  // two do not read as two identical boxes stacked on each other — repeating
  // the card treatment at every depth is what flattened these screens.
  | 'inset'
  // Structure with no fill of its own: grouping only, for panels already
  // sitting on a card.
  | 'outline'

interface CardProps extends ViewProps {
  tone?: CardTone
  // Cards default to 16pt of padding; pass false when the card owns rows that
  // need to run edge to edge (a list with full-bleed dividers).
  padded?: boolean
  style?: StyleProp<ViewStyle>
}

export function Card({
  tone = 'raised',
  padded = true,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      style={[styles.base, styles[tone], padded && styles.padded, style]}
      {...rest}
    >
      {children}
    </View>
  )
}

const BASE = {
  borderRadius: radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.divider,
} as const

/**
 * The `raised` card treatment as a plain style object, for the rows that ARE
 * the pressable rather than containing one.
 *
 * Exported rather than duplicated: the Build list's two row components had this
 * written out property for property, so an elevation or a contrast fix to Card
 * would have left the two most-seen surfaces in the app looking different from
 * every other card in the same scroll view.
 */
export const raisedSurface = {
  ...BASE,
  backgroundColor: colors.surface,
  padding: spacing.md,
} as const

const styles = StyleSheet.create({
  base: BASE,
  padded: { padding: spacing.md },
  raised: { backgroundColor: colors.surface },
  inset: { backgroundColor: colors.background, borderRadius: radius.md },
  outline: { backgroundColor: 'transparent', borderRadius: radius.md },
})
