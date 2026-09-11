import { useEntitlements } from '@shared/hooks/useEntitlements'
import useParlayStore from '@shared/store/parlayStore'
import type { BookLines, RiskLevel } from '@shared/types'
import { StyleSheet, Text, View } from 'react-native'

import { ChipStrip, type StripOption } from '@/components/ui/ChipStrip'
import { ProBadge } from '@/components/ui/ProBadge'
import { Segmented, type SegmentedOption } from '@/components/ui/Segmented'
import { Sheet } from '@/components/ui/Sheet'
import {
  bookOptions,
  effectiveBookKey,
  effectiveLegCount,
  legCountOptions,
  riskOptions,
} from '@/lib/build/runSettings'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

interface RunSettingsSheetProps {
  visible: boolean
  onClose: () => void
  // The week's per-book lines for this game, when a game is in view. Undefined
  // on the Build list, where the settings are not about one game yet.
  lines?: BookLines[]
  onUpgrade: (reason: string) => void
}

const LEG_CHIP_WIDTH = 64

/**
 * Risk, leg count and sportsbook, out of the game list and beside the action
 * they modify (DESIGN #7). Locked controls stay visible and legible: the
 * conversion moment is a control the user already wants (#8).
 */
export function RunSettingsSheet({
  visible,
  onClose,
  lines,
  onUpgrade,
}: RunSettingsSheetProps) {
  const riskLevel = useParlayStore(state => state.riskLevel)
  const setRiskLevel = useParlayStore(state => state.setRiskLevel)
  const legCount = useParlayStore(state => state.legCount)
  const setLegCount = useParlayStore(state => state.setLegCount)
  const bookmaker = useParlayStore(state => state.bookmaker)
  const setBookmaker = useParlayStore(state => state.setBookmaker)
  const { capabilities, entitlements } = useEntitlements()

  const sportsbooks = [...(entitlements?.sportsbooks ?? [])]
  const canChooseBook = capabilities?.chooseSportsbook ?? false
  const books = bookOptions({ sportsbooks, capabilities, chosen: bookmaker, lines })
  const selectedBook = effectiveBookKey({
    sportsbooks,
    capabilities,
    chosen: bookmaker,
    lines,
  })
  const unavailableCount = books.filter(b => b.disabled).length

  const riskChoices: SegmentedOption<RiskLevel>[] = riskOptions(capabilities)
  const proLegCount = entitlements?.proCapabilities.legCount
  const legChoices: StripOption<number>[] = legCountOptions(
    capabilities,
    proLegCount
  ).map(option => ({
    value: option.value,
    label: option.label,
    locked: option.locked,
    disabled: option.locked,
  }))
  const bookChoices: StripOption<string>[] = books.map(book => ({
    value: book.key,
    label: book.title,
    caption: book.caption,
    captionTone: 'muted' as const,
    // "Not available" means this book has not posted this game: inert, nothing
    // to offer. A *locked* book is a live target that opens the upsell, so it
    // is deliberately not disabled.
    disabled: book.disabled,
    locked: book.locked,
  }))

  return (
    <Sheet visible={visible} title="Run settings" onClose={onClose}>
      <View style={styles.field}>
        <Text style={styles.label}>Risk</Text>
        <Segmented
          options={riskChoices}
          value={riskLevel}
          onChange={setRiskLevel}
          accessibilityLabel="Risk level"
          onLockedPress={option =>
            onUpgrade(`The ${option.label.toLowerCase()} risk level is part of Pro.`)
          }
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Legs</Text>
        <ChipStrip
          options={legChoices}
          value={effectiveLegCount(capabilities, legCount)}
          onChange={setLegCount}
          accessibilityLabel="Leg count"
          chipWidth={LEG_CHIP_WIDTH}
        />
        {/* The Pro range is the server's, not a sentence restating it. */}
        {capabilities &&
        proLegCount &&
        capabilities.legCount.min === capabilities.legCount.max ? (
          <Text style={styles.hint}>
            Parlays are {capabilities.legCount.min} legs on your plan — {proLegCount.min}–
            {proLegCount.max} with Pro.
          </Text>
        ) : null}
      </View>

      {sportsbooks.length > 0 ? (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Sportsbook</Text>
            {canChooseBook ? null : <ProBadge />}
          </View>

          {/* Not wrapped in a blanket overlay: the strip scrolls past four
              books, and blocking touches to catch the upsell tap also blocked
              the scroll — locking a control should not stop you looking at the
              rest of it. Each locked chip offers Pro on its own. */}
          <ChipStrip
            options={bookChoices}
            value={selectedBook ?? ''}
            onChange={key => setBookmaker(key || undefined)}
            onLockedPress={() =>
              onUpgrade('Pricing every leg on your own sportsbook is part of Pro.')
            }
            accessibilityLabel="Sportsbook"
          />

          {/* Disclosure splits by tier (DESIGN #20). A free user never chose a
              book, so naming the swap after the fact is the whole disclosure. A
              Pro user made a deliberate choice and is told before the run
              instead, which is what the disabled chips above are. */}
          {canChooseBook ? (
            unavailableCount > 0 ? (
              <Text style={styles.hint}>
                {unavailableCount === 1 ? 'One book has' : `${unavailableCount} books have`}{' '}
                not posted this game yet.
              </Text>
            ) : null
          ) : (
            <Text style={styles.hint}>
              If {sportsbooks[0]?.title} hasn&apos;t posted a game, the next book that has is
              used and named on the parlay.
            </Text>
          )}
        </View>
      ) : null}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.label, color: colors.text },
  hint: { ...typography.caption, color: colors.textSecondary },
})
