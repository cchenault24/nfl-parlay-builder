import { formatOdds } from '@shared/odds'
import type { AgentGameResult, GeneratedParlay } from '@shared/types'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { GameSummaryView } from '@/components/display/GameSummaryView'
import { ParlayDisplayFooter } from '@/components/display/ParlayDisplayFooter'
import { ParlayLegView } from '@/components/display/ParlayLegView'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

interface ParlayViewProps {
  parlay: GeneratedParlay
  // The run's own view of its games, when this is the run that built it.
  // A saved parlay has only what the document carries.
  games?: AgentGameResult[]
  // The billing note for a run that came back unbilled; the build screen
  // knows, a saved parlay does not.
  notice?: string | null
  // Sits in the header beside the odds — the saved status, for History.
  accessory?: ReactNode
  // Rendered between the legs and the footer: the build screen's save banners.
  children?: ReactNode
}

// The parlay itself, as one piece the build flow and History both render. The
// pieces live in the parent's scroll view so each screen keeps its own
// pinned bar and padding; this is the content, not the chrome.
export function ParlayView({
  parlay,
  games,
  notice,
  accessory,
  children,
}: ParlayViewProps) {
  const hasEstimate = parlay.legs.some(leg => !leg.anchored)
  const contextFor = (gameId: string) => {
    const game = games?.find(g => g.game.gameId === gameId)?.game
    return game
      ? `${game.away.name} @ ${game.home.name} — Week ${game.week}`
      : parlay.gameContext
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {/* The book the anchored prices came from sits in the headline:
              the settings row names it before the run, and nothing on this
              screen did after. */}
          <Text style={styles.headline} accessibilityRole="header">
            {parlay.legs.length}-leg parlay
            {parlay.bookmaker ? (
              <Text style={styles.headlineBook}> · {parlay.bookmaker}</Text>
            ) : null}
          </Text>
          <Text style={styles.context}>{parlay.gameContext}</Text>
        </View>
        <View style={styles.headerTrailing}>
          <Text style={styles.odds}>{formatOdds(parlay.combinedOdds)}</Text>
          {accessory}
        </View>
      </View>

      <ConfidenceBar
        label="Overall confidence"
        value={parlay.parlayConfidence}
      />

      {/* Two independent facts, and they do not always travel together. The
          banner used to render only on `hasEstimate` (an unanchored leg) with
          the refund line nested inside it — but billing keys off the odds
          source, so a run where every leg anchored yet a game's odds degraded
          was never billed and never said so. */}
      {hasEstimate || notice ? (
        <ErrorBanner
          type="rate_limit_reached"
          title={
            hasEstimate ? 'Contains estimated prices' : 'This one was free'
          }
          message={[
            hasEstimate
              ? 'One or more legs are marked “Estimate” — the book hadn’t posted a line for that market, so the price is an AI estimate rather than a real one.'
              : null,
            notice,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}

      {parlay.gameSummary.slateSummary ? (
        <ErrorBanner
          type="info"
          title="Across these games"
          message={parlay.gameSummary.slateSummary}
        />
      ) : null}

      {parlay.gameSummary.games.map(analysis => (
        <GameSummaryView
          key={analysis.gameId}
          analysis={analysis}
          gameContext={contextFor(analysis.gameId)}
          collapsedByDefault
        />
      ))}

      <View style={styles.legs}>
        {parlay.legs.map((leg, index) => (
          <ParlayLegView
            key={`${parlay.parlayId}-${leg.betType}-${leg.selection}`}
            leg={leg}
            index={index}
          />
        ))}
      </View>

      {children}

      <ParlayDisplayFooter parlay={parlay} />
    </>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xxs },
  headerTrailing: { alignItems: 'flex-end', gap: spacing.xs },
  headline: { ...typography.title, color: colors.text },
  headlineBook: {
    color: colors.textSecondary,
    fontFamily: typography.body.fontFamily,
  },
  context: { ...typography.caption, color: colors.textSecondary },
  // The number people came for, at display size and anchored to the trailing
  // edge where the eye lands last.
  odds: {
    ...typography.display,
    color: colors.primaryBright,
    fontVariant: ['tabular-nums'],
  },
  legs: { gap: spacing.sm },
})
