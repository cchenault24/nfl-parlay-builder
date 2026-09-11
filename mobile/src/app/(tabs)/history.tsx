import Ionicons from '@expo/vector-icons/Ionicons'
import { requestGrading } from '@shared/api/GradingService'
import { getBetTypeColor } from '@shared/betColors'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { formatOdds } from '@shared/odds'
import type { GeneratedParlay, LegOutcome, ParlayOutcome } from '@shared/types'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorBanner } from '@/components/ErrorBanner'
import UpgradeSheet from '@/components/UpgradeSheet'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { useAuth } from '@/lib/auth/useAuth'
import { auth } from '@/lib/firebase'
import { getUserParlays } from '@/lib/parlays'
import { colors, semanticColor, spacing, typography } from '@/lib/theme/designTokens'

const OUTCOME: Record<ParlayOutcome | 'pending', { label: string; color: string }> = {
  won: { label: 'Won', color: colors.success },
  lost: { label: 'Lost', color: colors.error },
  push: { label: 'Push', color: colors.textSecondary },
  partial: { label: 'Partial', color: colors.warning },
  pending: { label: 'Pending', color: colors.info },
}

const LEG_OUTCOME: Record<LegOutcome, { label: string; color: string }> = {
  won: { label: 'Won', color: colors.success },
  lost: { label: 'Lost', color: colors.error },
  push: { label: 'Push', color: colors.textSecondary },
  ungraded: { label: 'Ungraded', color: colors.warning },
}

function OutcomeChip({ parlay }: { parlay: GeneratedParlay }) {
  const outcome =
    parlay.grading?.status === 'graded' ? parlay.grading.parlayOutcome : 'pending'
  if (!outcome) {
    return null
  }
  const style = OUTCOME[outcome]
  return <Chip label={style.label} tint={style.color} />
}

export default function HistoryScreen() {
  const { user } = useAuth()
  const {
    capabilities,
    entitlements,
    isLoading,
    error: entitlementsError,
    refetch,
  } = useEntitlements()
  const [loaded, setLoaded] = useState<GeneratedParlay[] | null>(null)
  const [error, setError] = useState('')
  const [upgradeVisible, setUpgradeVisible] = useState(false)

  // How much history this plan shows; null is unbounded. Undefined means the
  // answer has not arrived, which is NOT the same as unbounded — defaulting it
  // to null meant a failed /entitlements call silently lifted a free user's cap
  // to their entire archive. The query below simply waits instead.
  //
  // Worth being clear about what this is: a view restriction, not a boundary.
  // firestore.rules lets a user read every parlay they saved, and getUserParlays
  // fetches them all and slices here, so this shapes the product rather than
  // guarding anything. Making it a real limit would need a server-side query.
  const depth = capabilities?.historyDepth
  const depthKnown = capabilities !== undefined

  // Derived rather than cleared in the effect: the tabs unmount on sign-out
  // (app/_layout.tsx guards them), so this only has to cover the frame between
  // the user going away and this screen leaving with it.
  const parlays = user ? loaded : null

  useEffect(() => {
    if (!user || !depthKnown) {
      return
    }
    // Both writes live in the listener's callbacks. Clearing the error on a
    // successful snapshot also means a listener that recovers stops showing a
    // stale failure, which clearing it once on subscribe never did.
    const unsubscribe = getUserParlays(
      user.uid,
      next => {
        setError('')
        setLoaded(next)
      },
      message => {
        setError(message)
        setLoaded([])
      },
      depth ?? null
    )
    return unsubscribe
  }, [user, depth, depthKnown])

  useEffect(() => {
    if (!user) {
      return
    }
    // Fire-and-forget: grades anything unGraded. Results arrive through the
    // Firestore listener above, not this call.
    auth.currentUser
      ?.getIdToken()
      .then(requestGrading)
      .catch(() => undefined)
  }, [user])

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.screenTitle} accessibilityRole="header">
          History
        </Text>

        {error ? (
          <ErrorBanner type="error" title="Couldn't load history" message={error} />
        ) : null}

        {/* Surfaced rather than worked around: without the plan there is no
            honest amount of history to show. */}
        {entitlementsError && !isLoading ? (
          <ErrorBanner
            type="error"
            title="Couldn't load your plan"
            message={entitlementsError}
          />
        ) : null}

        {parlays === null || isLoading || !depthKnown ? (
          <View style={styles.centre}>
            <ActivityIndicator color={colors.primaryBright} />
          </View>
        ) : parlays.length === 0 && !error ? (
          <View style={styles.centre}>
            <Ionicons name="bookmark-outline" size={44} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>No saved parlays yet</Text>
            <Text style={styles.emptyBody}>
              Build a parlay and tap Save, and it will show up here.
            </Text>
          </View>
        ) : (
          parlays.map(parlay => (
            <Card key={parlay.parlayId} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.context} numberOfLines={2}>
                  {parlay.gameContext || 'NFL parlay'}
                </Text>
                <OutcomeChip parlay={parlay} />
                <Chip
                  label={formatOdds(parlay.combinedOdds)}
                  tint={colors.primaryBright}
                  numeric
                />
              </View>

              {parlay.legs.map((leg, i) => {
                const legOutcome = parlay.grading?.legOutcomes?.[i]
                const tint = semanticColor[getBetTypeColor(leg.betType)]
                return (
                  <View key={`${parlay.parlayId}-${i}`} style={styles.leg}>
                    <View style={styles.legHeader}>
                      <Text style={styles.legSelection} numberOfLines={2}>
                        {leg.selection}
                      </Text>
                      <Text style={[styles.legOdds, { color: tint }]}>
                        {formatOdds(leg.odds)}
                      </Text>
                    </View>
                    <View style={styles.legMeta}>
                      <Text style={styles.legType}>{leg.betType.replace(/_/g, ' ')}</Text>
                      {legOutcome ? (
                        <Text style={[styles.legResult, { color: LEG_OUTCOME[legOutcome].color }]}>
                          {LEG_OUTCOME[legOutcome].label}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </Card>
          ))
        )}

        {depth != null && parlays !== null && parlays.length === depth ? (
          <Pressable onPress={() => setUpgradeVisible(true)}>
            <Text style={styles.depthNote}>
              Showing your last {depth}.{' '}
              <Text style={styles.depthLink}>Pro keeps every parlay, every season.</Text>
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <UpgradeSheet
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        onPurchased={refetch}
        canPurchase={entitlements?.billingAvailable.apple ?? false}
        reason="Your full history, every season, is part of Pro."
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  screenTitle: { ...typography.heading, color: colors.text },
  centre: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.title, color: colors.textSecondary },
  emptyBody: { ...typography.bodySmall, color: colors.textDisabled, textAlign: 'center' },
  depthNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  depthLink: { color: colors.primaryBright },

  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  context: { ...typography.label, color: colors.text, flex: 1 },

  leg: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: spacing.xxs,
  },
  legHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  legSelection: { ...typography.bodySmall, color: colors.text, flex: 1 },
  legOdds: { ...typography.numericSmall },
  legMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legType: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  legResult: { ...typography.micro },
})
