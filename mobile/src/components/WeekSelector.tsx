import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { StyleSheet, Text, View } from 'react-native'

import { ChipStrip, type StripOption } from '@/components/ui/ChipStrip'
import { colors, spacing, typography } from '@/lib/theme/designTokens'

const CHIP_WIDTH = 64

interface WeekSelectorProps {
  currentWeek: number
  onWeekChange: (week: number) => void
  availableWeeks: number[]
}

// The web client uses a dropdown menu. On a phone a horizontal strip shows
// the surrounding weeks at a glance and needs one tap instead of two.
export function WeekSelector({
  currentWeek,
  onWeekChange,
  availableWeeks,
}: WeekSelectorProps) {
  const { currentWeek: liveWeek } = useDerivedCurrentWeek()

  const options: StripOption<number>[] = availableWeeks.map(week => ({
    value: week,
    label: String(week),
    caption: week === liveWeek ? 'now' : undefined,
    disabled: week < liveWeek,
    locked: week < liveWeek,
  }))

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Week</Text>
        <Text style={styles.hint}>Week {liveWeek} is current · past weeks are locked</Text>
      </View>
      <ChipStrip
        options={options}
        value={currentWeek}
        onChange={onWeekChange}
        accessibilityLabel="Week"
        chipWidth={CHIP_WIDTH}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  labelRow: { gap: spacing.xxs },
  label: { ...typography.label, color: colors.text },
  hint: { ...typography.caption, color: colors.textSecondary },
})
