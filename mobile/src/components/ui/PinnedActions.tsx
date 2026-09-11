import type { ReactNode } from 'react'
import {
  StyleProp,
  StyleSheet,
  ViewStyle,
  type LayoutChangeEvent,
} from 'react-native'

import { GlassSurface } from '@/components/ui/GlassSurface'
import { colors, spacing } from '@/lib/theme/designTokens'

/**
 * The bar pinned to the bottom of a Build-stack screen, and the space a scroll
 * view has to leave for it.
 *
 * The bar itself was written out at each site: the same absolutely-positioned
 * GlassSurface on three screens, with the same four-line comment above it.
 *
 * The space is not a constant. It was guessed three different ways — 144pt
 * twice and 200 once, for a bar that measures about 84 — which showed as dead
 * space under the last card and would have hidden it outright the moment the
 * bar grew a line. `onLayout` reports the real height, so the reserve is exact
 * and survives the bar changing; the parlay screen's has since gained a second
 * button.
 *
 * No safe-area inset. This sits inside the tab navigator, so the tab bar is
 * already between it and the home indicator and has already absorbed that inset
 * — adding it again pads for a gap something else is filling.
 */
export function PinnedActions({
  children,
  style,
  onLayout,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  // Reports the bar's measured height, for the scroll view that has to clear it.
  onLayout?: (event: LayoutChangeEvent) => void
}) {
  return (
    <GlassSurface style={[styles.bar, style]} onLayout={onLayout}>
      {children}
    </GlassSurface>
  )
}

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
