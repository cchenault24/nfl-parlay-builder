import Ionicons from '@expo/vector-icons/Ionicons'
import { formatOdds } from '@shared/odds'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { ErrorBanner } from '@/components/ErrorBanner'
import { AgentProgress } from '@/components/display/AgentProgress'
import { GameSummaryView } from '@/components/display/GameSummaryView'
import { ParlayDisplayFooter } from '@/components/display/ParlayDisplayFooter'
import { ParlayLegView } from '@/components/display/ParlayLegView'
import { useAuth } from '@/lib/auth/useAuth'
import { saveParlayToUser } from '@/lib/parlays'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'
import useParlayStore from '@/store/parlayStore'

export function ParlayDisplay({
  loading,
  onCancel,
}: {
  loading: boolean
  onCancel: () => void
}) {
  const { user } = useAuth()
  const parlay = useParlayStore(state => state.parlay)
  const steps = useParlayStore(state => state.steps)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')

  if (loading) {
    return <AgentProgress steps={steps} onCancel={onCancel} />
  }

  if (!parlay) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Pick a game above, choose a risk level, and create a 3-leg parlay.
        </Text>
      </View>
    )
  }

  const save = async () => {
    if (!user) {
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await saveParlayToUser(user.uid, parlay)
      setSavedId(parlay.parlayId)
    } catch {
      setSaveError('Failed to save parlay. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const alreadySaved = savedId === parlay.parlayId
  const hasEstimate = parlay.legs.some(leg => !leg.anchored)

  return (
    <View style={styles.wrap}>
      <GameSummaryView
        gameSummary={parlay.gameSummary}
        gameContext={parlay.gameContext}
      />

      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="bulb-outline" size={20} color={colors.primary} />
          <Text style={styles.title}>3-leg parlay</Text>
          <View style={styles.oddsChip}>
            <Text style={styles.oddsText}>{formatOdds(parlay.combinedOdds)}</Text>
          </View>
        </View>

        {hasEstimate ? (
          <ErrorBanner
            type="rate_limit_reached"
            title="Contains estimated prices"
            message={'One or more legs are marked "Estimate" — the book hadn’t posted a line for that market, so the price is an AI estimate rather than a real one.'}
          />
        ) : null}

        <View style={styles.legs}>
          {parlay.legs.map((leg, index) => (
            <ParlayLegView
              key={`${parlay.parlayId}-${leg.betType}-${leg.selection}`}
              leg={leg}
              index={index}
            />
          ))}
        </View>

        {saveError ? (
          <ErrorBanner type="error" title="Failed to save parlay" message={saveError} />
        ) : null}
        {alreadySaved ? (
          <ErrorBanner
            type="success"
            title="Parlay saved"
            message="Find it under the History tab."
          />
        ) : null}

        <Pressable
          onPress={save}
          disabled={saving || alreadySaved}
          style={({ pressed }) => [
            styles.saveBtn,
            (pressed || saving || alreadySaved) && styles.pressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name={alreadySaved ? 'checkmark' : 'bookmark-outline'}
                size={18}
                color={colors.primary}
              />
              <Text style={styles.saveText}>
                {alreadySaved ? 'Saved' : 'Save parlay'}
              </Text>
            </>
          )}
        </Pressable>

        <View style={styles.divider} />
        <ParlayDisplayFooter parlay={parlay} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  empty: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.title, color: colors.text, flex: 1 },
  oddsChip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  oddsText: { ...typography.numeric, color: colors.primary },

  legs: { gap: spacing.sm },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  saveText: { ...typography.button, color: colors.primary },
  pressed: { opacity: 0.6 },

  divider: { height: 1, backgroundColor: colors.divider },
})
