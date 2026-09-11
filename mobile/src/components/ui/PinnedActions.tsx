import type { ReactNode } from 'react'
import { StyleProp, StyleSheet, ViewStyle } from 'react-native'

import { GlassSurface } from '@/components/ui/GlassSurface'
import { colors, spacing } from '@/lib/theme/designTokens'

/**
 * The bar pinned to the bottom of a Build-stack screen, and the space a scroll
 * view has to leave for it.
 *
 * Both used to be written out at each site: the same absolutely-positioned
 * GlassSurface on three screens, and the room to clear it expressed three
 * different ways — `spacing.xxl * 3` twice and a bare `200` once. Three numbers
 * for one measurement, none of them derived from the bar, so a bar that grew a
 * second line hid the last card on whichever screens nobody thought to check.
 *
 * No safe-area inset. This sits inside the tab navigator, so the tab bar is
 * already between it and the home indicator and has already absorbed that inset
 * — adding it again pads for a gap something else is filling.
 */
export function PinnedActions({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return <GlassSurface style={[styles.bar, style]}>{children}</GlassSurface>
}

// What a scroll view must reserve so its last item clears the bar. Generous on
// purpose: the bar's height depends on how many controls it carries, and the
// cost of over-reserving is a little empty space rather than hidden content.
export const PINNED_ACTIONS_SPACE = spacing.xxl * 3

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
})
