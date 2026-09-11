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

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  padded: { padding: spacing.md },
  raised: { backgroundColor: colors.surface },
  inset: { backgroundColor: colors.background, borderRadius: radius.md },
  outline: { backgroundColor: 'transparent', borderRadius: radius.md },
})
