import { EmptyState, ScreenLoading } from '@/components/ui/ScreenState'
import { requestGrading } from '@shared/api/GradingService'
import { betTypeLabel, getBetTypeColor } from '@shared/betColors'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { formatOdds } from '@shared/odds'
import { parlayStatus } from '@shared/parlays'
import type { GeneratedParlay, LegOutcome } from '@shared/types'
import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { UpgradeSheet } from '@/components/UpgradeSheet'
import { Button } from '@/components/ui/Button'
import { ParlayStatusChip } from '@/components/display/ParlayStatusChip'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { LinkButton } from '@/components/ui/LinkButton'
import { useAuth } from '@/lib/auth/useAuth'
import { auth } from '@/lib/firebase'
import { getUserParlays } from '@/lib/parlays'
import {
  colors,
  PRESSED_OPACITY,
  semanticColor,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

const LEG_OUTCOME: Record<LegOutcome, { label: string; color: string }> = {
  won: { label: 'Won', color: colors.success },
  lost: { label: 'Lost', color: colors.error },
  push: { label: 'Push', color: colors.textSecondary },
  ungraded: { label: 'Ungraded', color: colors.warning },
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
          <>
            <ErrorBanner
              type="error"
              title="Couldn't load your plan"
              message={entitlementsError}
            />
            <Button variant="outline" label="Try again" onPress={() => void refetch()} />
          </>
        ) : null}

        {parlays === null || isLoading || !depthKnown ? (
          <ScreenLoading />
        ) : parlays.length === 0 && !error ? (
          <EmptyState
            icon="bookmark-outline"
            title="No saved parlays yet"
            body="Build a parlay and tap Save, and it will show up here."
          />
        ) : (
          parlays.map(parlay => (
            <Pressable
              key={parlay.parlayId}
              onPress={() => router.push(`/saved/${parlay.parlayId}`)}
              accessibilityRole="button"
              accessibilityLabel={`${parlay.gameContext || 'NFL parlay'}, ${parlayStatus(parlay).label}, ${formatOdds(parlay.combinedOdds)}`}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <Text style={styles.context} numberOfLines={2}>
                      {parlay.gameContext || 'NFL parlay'}
                    </Text>
                    {/* Absent on parlays saved before the book was recorded. */}
                    {parlay.bookmaker ? (
                      <Text style={styles.book}>{parlay.bookmaker}</Text>
                    ) : null}
                  </View>
                  <View style={styles.cardChips}>
                    <Chip
                      label={formatOdds(parlay.combinedOdds)}
                      tint={colors.primaryBright}
                      numeric
                    />
                    <ParlayStatusChip status={parlayStatus(parlay)} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>

              {/* A compact row rather than ParlayLegView: that component is a
                  detail card carrying reasoning, a confidence bar and the
                  implied probability, and a list of saved parlays would be
                  unreadable with one per leg. What it must not lose is meaning
                  — the odds are tinted like ParlayLegView's, the bet type is a
                  chip rather than the thing carrying the colour, and an
                  estimated price is marked. Without that marker a saved parlay
                  priced by the model was indistinguishable from one priced
                  against a real book. */}
              {parlay.legs.map((leg, i) => {
                const legOutcome = parlay.grading?.legOutcomes?.[i]
                const tint = semanticColor[getBetTypeColor(leg.betType)]
                return (
                  <View key={`${parlay.parlayId}-${i}`} style={styles.leg}>
                    <View style={styles.legHeader}>
                      <Text style={styles.legSelection} numberOfLines={2}>
                        {leg.selection}
                      </Text>
                      <Text style={[styles.legOdds, { color: colors.primaryBright }]}>
                        {formatOdds(leg.odds)}
                      </Text>
                    </View>
                    <View style={styles.legMeta}>
                      <Chip label={betTypeLabel(leg.betType)} tint={tint} />
                      {leg.anchored === false ? (
                        <Chip label="Estimate" tint={colors.warning} />
                      ) : null}
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
            </Pressable>
          ))
        )}

        {depth != null && parlays !== null && parlays.length === depth ? (
          <View style={styles.depthNote}>
            <Text style={styles.depthText}>Showing your last {depth}.</Text>
            <LinkButton
              label="Pro keeps every parlay, every season."
              onPress={() => setUpgradeVisible(true)}
              role="button"
              textStyle={styles.depthLink}
            />
          </View>
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
  depthNote: { alignItems: 'center' },
  depthText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  depthLink: { ...typography.caption, textAlign: 'center' },

  card: { gap: spacing.sm },
  pressed: { opacity: PRESSED_OPACITY },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { flex: 1, gap: spacing.xxs },
  cardChips: { alignItems: 'flex-end', gap: spacing.xs },
  context: { ...typography.label, color: colors.text },
  book: { ...typography.caption, color: colors.textSecondary },

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
  legResult: { ...typography.micro, marginLeft: 'auto' },
})
