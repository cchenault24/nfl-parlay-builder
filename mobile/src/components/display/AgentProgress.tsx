import { SECOND_TICK, useNow } from '@/lib/useNow'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { AgentStep } from '@shared/types'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import { waitEstimate } from '@/lib/build/quotaCopy'
import { formatElapsed, STEP_ROWS, stepMeta } from '@shared/agentSteps'
import {
  colors,
  HIT_SLOP,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

function StatusGlyph({ step }: { step?: AgentStep }) {
  if (!step) {
    return <View style={[styles.glyph, styles.glyphPending]} />
  }
  if (step.status === 'running') {
    return (
      <ActivityIndicator size="small" color={colors.primaryBright} style={styles.glyph} />
    )
  }
  if (step.status === 'failed') {
    return (
      <View style={[styles.glyph, styles.glyphFailed]}>
        <Ionicons name="close" size={13} color={colors.background} />
      </View>
    )
  }
  return (
    <View style={[styles.glyph, styles.glyphDone]}>
      <Ionicons name="checkmark" size={13} color={colors.background} />
    </View>
  )
}

interface AgentProgressProps {
  steps: AgentStep[]
  // Drives the wait estimate, and decides whether a row shows "4 of 6".
  gameCount: number
  // The run's own start, not this component's mount: the screen can be left and
  // come back, and the clock has to keep telling the truth.
  startedAt: number
  onCancel: () => void
}

export function AgentProgress({
  steps,
  gameCount,
  startedAt,
  onCancel,
}: AgentProgressProps) {
  const elapsed = Math.max(0, useNow(SECOND_TICK) - startedAt)

  const byId = new Map(steps.map(s => [s.id, s]))

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            Building your parlay
          </Text>
          <Text style={styles.subtitle}>
            Each step reports as it finishes. {waitEstimate(gameCount)}
          </Text>
        </View>
        <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
      </View>

      <View>
        {/* Eight rows however many games the run covers. A multi-game step
            counts through them in the meta column instead (CONTRACT §9.3). */}
        {STEP_ROWS.map((row, i) => {
          const step = byId.get(row.id)
          const meta = stepMeta(step, row)
          const failed = meta.failed
          return (
            <View key={row.id} style={[styles.row, i > 0 && styles.rowDivider]}>
              <StatusGlyph step={step} />
              <Text
                style={[
                  styles.rowLabel,
                  !step && styles.rowLabelPending,
                  step?.status === 'running' && styles.rowLabelRunning,
                ]}
              >
                {row.label}
              </Text>
              <Text style={[styles.rowMeta, failed && styles.rowMetaFailed]}>
                {meta.text}
              </Text>
            </View>
          )
        })}
      </View>

      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        hitSlop={HIT_SLOP}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </Card>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },
  elapsed: {
    ...typography.numeric,
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  glyph: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphPending: { borderWidth: 1.5, borderColor: colors.border },
  glyphDone: { backgroundColor: colors.primary },
  glyphFailed: { backgroundColor: colors.warning },
  rowLabel: { ...typography.bodySmall, color: colors.text, flex: 1 },
  rowLabelPending: { color: colors.textDisabled },
  rowLabelRunning: { color: colors.text },
  rowMeta: {
    ...typography.micro,
    fontVariant: ['tabular-nums'],
    color: colors.textSecondary,
    textAlign: 'right',
  },
  rowMetaFailed: { color: colors.warning },

  cancel: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    minHeight: MIN_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  cancelText: { ...typography.label, color: colors.textSecondary },
  pressed: { opacity: PRESSED_OPACITY },
})
