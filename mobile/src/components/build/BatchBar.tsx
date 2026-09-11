import { StyleSheet, Text, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { GlassSurface } from '@/components/ui/GlassSurface'
import { Segmented, type SegmentedOption } from '@/components/ui/Segmented'
import type { Allowance } from '@shared/rateLimits'
import {
  batchCostLine,
  batchExceedsAllowance,
  type BatchMode,
} from '@/lib/build/batch'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

interface BatchBarProps {
  mode: BatchMode
  onModeChange: (mode: BatchMode) => void
  gameCount: number
  // Whichever of the weekly quota, the daily valve and the hourly window will
  // refuse a run first. Null while nothing is known.
  allowance: Allowance | null
  // Cross-game is a Pro feature; a locked segment still shows, and explains.
  maxGamesPerRun: number
  running: boolean
  onRun: () => void
  onLockedMode: () => void
  // Reports the bar's measured height, so the list can reserve exactly that.
  onLayout?: (event: LayoutChangeEvent) => void
}

/**
 * Replaces the tab bar in select mode rather than stacking above it: two bottom
 * bars eat ~150pt and read as clutter, and select mode is modal by nature —
 * Done is the way out (DESIGN #11). The Build list hides the tab bar to match.
 *
 * That is also why this keeps its own geometry rather than using PinnedActions:
 * a bar standing *in place of* the tab bar pads differently from one sitting
 * above it.
 */
export function BatchBar({
  mode,
  onModeChange,
  gameCount,
  allowance,
  maxGamesPerRun,
  running,
  onLayout,
  onRun,
  onLockedMode,
}: BatchBarProps) {
  // Unlike the other pinned bars, this one hides the tab bar and takes the
  // bottom edge itself — so the home-indicator inset is its to pay.
  const insets = useSafeAreaInsets()
  const overCap = mode === 'cross' && gameCount > maxGamesPerRun
  const overAllowance = batchExceedsAllowance({ mode, gameCount, allowance })

  const modes: SegmentedOption<BatchMode>[] = [
    {
      value: 'separate',
      label: gameCount === 1 ? '1 parlay' : `${gameCount} parlays`,
    },
    { value: 'cross', label: 'One cross-game', locked: maxGamesPerRun < 2 },
  ]

  const costLine = overCap
    ? `A cross-game parlay covers at most ${maxGamesPerRun} games.`
    : batchCostLine({ mode, gameCount, allowance })

  return (
    <GlassSurface style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
      <Segmented
        options={modes}
        value={mode}
        onChange={onModeChange}
        accessibilityLabel="What to build"
        onLockedPress={onLockedMode}
      />

      <Button
        label={mode === 'cross' ? 'Build cross-game parlay' : `Build ${gameCount === 1 ? 'parlay' : `${gameCount} parlays`}`}
        icon="dice-outline"
        loading={running}
        disabled={gameCount === 0 || overCap || overAllowance || running}
        onPress={onRun}
      />

      {/* Not decoration. A run is what the server charges, in both currencies,
          and discovering that halfway through a batch is the worst version
          (DESIGN #22). */}
      <Text style={[styles.cost, (overCap || overAllowance) && styles.costWarning]}>
        {costLine}
      </Text>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  cost: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  costWarning: { color: colors.warning },
})
