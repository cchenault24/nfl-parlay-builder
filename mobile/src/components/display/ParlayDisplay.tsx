import Ionicons from '@expo/vector-icons/Ionicons'
import { formatOdds } from '@shared/odds'
import useParlayStore from '@shared/store/parlayStore'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ErrorBanner } from '@/components/ErrorBanner'
import { AgentProgress } from '@/components/display/AgentProgress'
import { GameSummaryView } from '@/components/display/GameSummaryView'
import { ParlayDisplayFooter } from '@/components/display/ParlayDisplayFooter'
import { ParlayLegView } from '@/components/display/ParlayLegView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { useAuth } from '@/lib/auth/useAuth'
import { saveParlayToUser } from '@/lib/parlays'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

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
      <Card style={styles.empty}>
        <Text style={styles.emptyText}>
          Pick a game above, choose a risk level, and create your parlay.
        </Text>
      </Card>
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

      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="bulb-outline" size={20} color={colors.primaryBright} />
          <Text style={styles.title} accessibilityRole="header">
            {parlay.legs.length}-leg parlay
          </Text>
          <Chip
            label={formatOdds(parlay.combinedOdds)}
            tint={colors.primaryBright}
            numeric
          />
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

        <Button
          variant="outline"
          label={alreadySaved ? 'Saved' : 'Save parlay'}
          icon={alreadySaved ? 'checkmark' : 'bookmark-outline'}
          loading={saving}
          disabled={alreadySaved}
          onPress={save}
        />

        <View style={styles.divider} />
        <ParlayDisplayFooter parlay={parlay} />
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.title, color: colors.text, flex: 1 },

  legs: { gap: spacing.sm },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
})
