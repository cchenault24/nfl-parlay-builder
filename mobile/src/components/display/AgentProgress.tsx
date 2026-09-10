import Ionicons from '@expo/vector-icons/Ionicons'
import type { AgentStep } from '@shared/types'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

// Mirrors the web ROWS table. `optional` steps are allowed to fail without
// failing the run — they render as "unavailable — continuing" rather than as
// an error, or a degraded run looks broken.
const ROWS: { id: string; label: string; optional?: boolean }[] = [
  { id: 'step_plan', label: 'Plan the run' },
  { id: 'step_tool_espn_game', label: 'Load game, venue & forecast' },
  { id: 'step_tool_espn_team_stats', label: 'Pull team statistics', optional: true },
  { id: 'step_tool_espn_pregame', label: 'Check injuries & recent form', optional: true },
  { id: 'step_tool_nflverse_epa', label: 'Pull EPA efficiency stats', optional: true },
  { id: 'step_tool_odds', label: 'Fetch book lines', optional: true },
  { id: 'step_draft', label: 'Draft the parlay' },
  { id: 'step_validate', label: 'Check legs against the lines' },
]

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function StatusGlyph({ step }: { step?: AgentStep }) {
  if (!step) {
    return <View style={[styles.glyph, styles.glyphPending]} />
  }
  if (step.status === 'running') {
    return <ActivityIndicator size="small" color={colors.primary} style={styles.glyph} />
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
  onCancel: () => void
}

export function AgentProgress({ steps, onCancel }: AgentProgressProps) {
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 250)
    return () => clearInterval(t)
  }, [startedAt])

  const byId = new Map(steps.map(s => [s.id, s]))

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Building your parlay</Text>
          <Text style={styles.subtitle}>
            Each step reports as it finishes. Runs usually take 20–60 seconds.
          </Text>
        </View>
        <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
      </View>

      <View>
        {ROWS.map((row, i) => {
          const step = byId.get(row.id)
          const failed = step?.status === 'failed'
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
                {failed
                  ? row.optional
                    ? 'unavailable — continuing'
                    : (step.error?.message ?? 'failed')
                  : step?.durationMs !== undefined
                    ? `${(step.durationMs / 1000).toFixed(1)}s`
                    : ''}
              </Text>
            </View>
          )
        })}
      </View>

      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },
  elapsed: { ...typography.numeric, color: colors.textSecondary, marginLeft: spacing.md },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  glyph: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphPending: { borderWidth: 1.5, borderColor: colors.divider },
  glyphDone: { backgroundColor: colors.primary },
  glyphFailed: { backgroundColor: colors.warning },
  rowLabel: { ...typography.bodySmall, color: colors.text, flex: 1 },
  rowLabelPending: { color: colors.textDisabled },
  rowLabelRunning: { color: colors.text },
  rowMeta: { ...typography.numeric, fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  rowMetaFailed: { color: colors.warning },

  cancel: { alignSelf: 'flex-end', marginTop: spacing.md, padding: spacing.sm },
  cancelText: { ...typography.label, color: colors.textSecondary },
  pressed: { opacity: 0.6 },
})
