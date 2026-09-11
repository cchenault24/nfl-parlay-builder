import Ionicons from '@expo/vector-icons/Ionicons'
import type { GameAnalysis } from '@shared/types'
import { useState } from 'react'
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native'

import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function gameFlow(winProbability: number) {
  if (winProbability > 0.7) {
    return { label: 'Potential blowout', color: colors.secondary }
  }
  if (winProbability < 0.3) {
    return { label: 'Upset alert', color: colors.error }
  }
  return { label: 'Close game', color: colors.info }
}

interface GameSummaryViewProps {
  // One game's read. A parlay carries one per game it draws on, so the caller
  // renders one of these per entry rather than this component branching on the
  // run's size.
  analysis: GameAnalysis
  gameContext: string
  // The legs are the product; the essay is evidence. Expanded, it pushes the
  // legs below the fold on the screen whose whole purpose is showing them
  // (DESIGN #14).
  collapsedByDefault?: boolean
}

export function GameSummaryView({
  analysis,
  gameContext,
  collapsedByDefault = false,
}: GameSummaryViewProps) {
  const [open, setOpen] = useState(!collapsedByDefault)
  const { winner, projectedScore, winProbability } = analysis.gamePrediction
  const flow = gameFlow(winProbability)
  const confidencePct = Math.round(winProbability * 100)

  const toggle = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        180,
        LayoutAnimation.Types.easeOut,
        LayoutAnimation.Properties.opacity
      )
    )
    setOpen(v => !v)
  }

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`AI game analysis for ${gameContext}`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <Ionicons name="analytics-outline" size={20} color={colors.primaryBright} />
        <View style={styles.headerText}>
          <Text style={styles.title}>AI game analysis</Text>
          <Text style={styles.context} numberOfLines={1}>
            {gameContext}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      <View style={styles.chips}>
        <Chip label={flow.label} tint={flow.color} />
        <Chip label={`${confidencePct}% confidence`} tint={colors.primaryBright} numeric />
      </View>

      <View style={styles.prediction}>
        <Text style={styles.body}>
          {winner} wins {projectedScore.home}-{projectedScore.away}
        </Text>
      </View>

      {open ? (
        <>
          <Text style={styles.section}>Matchup analysis</Text>
          <Text style={styles.body}>{analysis.matchupSummary}</Text>

          {analysis.keyFactors.length > 0 ? (
            <>
              <Text style={styles.section}>Key factors</Text>
              {analysis.keyFactors.map(factor => (
                <View key={factor} style={styles.factor}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={colors.primaryBright}
                    style={styles.factorIcon}
                  />
                  <Text style={styles.body}>{factor}</Text>
                </View>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TARGET,
  },
  headerText: { flex: 1, gap: spacing.xxs },
  title: { ...typography.title, color: colors.text },
  context: { ...typography.caption, color: colors.textSecondary },
  pressed: { opacity: PRESSED_OPACITY },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  section: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  body: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  factor: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  factorIcon: { marginTop: 2 },
  prediction: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryBright,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
})
