import Ionicons from '@expo/vector-icons/Ionicons'
import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { useEffect, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

const CHIP_WIDTH = 68

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
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const index = availableWeeks.indexOf(currentWeek)
    if (index >= 0) {
      // Keep the selection roughly centred rather than off-screen left.
      scrollRef.current?.scrollTo({
        x: Math.max(0, index * (CHIP_WIDTH + spacing.sm) - CHIP_WIDTH),
        animated: true,
      })
    }
  }, [currentWeek, availableWeeks])

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Week</Text>
        <Text style={styles.hint}>Week {liveWeek} is current · past weeks are locked</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {availableWeeks.map(week => {
          const isPast = week < liveWeek
          const isSelected = week === currentWeek
          return (
            <Pressable
              key={week}
              disabled={isPast}
              onPress={() => onWeekChange(week)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isPast }}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                isPast && styles.chipPast,
                pressed && !isPast && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  isPast && styles.chipTextPast,
                ]}
              >
                {week}
              </Text>
              {isPast ? (
                <Ionicons name="lock-closed" size={10} color={colors.textDisabled} />
              ) : week === liveWeek ? (
                <Text style={styles.now}>now</Text>
              ) : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  labelRow: { gap: 2 },
  label: { ...typography.label, color: colors.text },
  hint: { ...typography.bodySmall, fontSize: 12, color: colors.textSecondary },
  strip: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    width: CHIP_WIDTH,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceRaised },
  chipPast: { opacity: 0.5 },
  chipText: { ...typography.numeric, fontSize: 17, color: colors.text },
  chipTextSelected: { color: colors.primary },
  chipTextPast: { color: colors.textDisabled },
  now: { ...typography.bodySmall, fontSize: 10, color: colors.secondary },
  pressed: { opacity: 0.7 },
})
