import Ionicons from '@expo/vector-icons/Ionicons'
import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Sheet } from '@/components/ui/Sheet'
import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

interface WeekPickerSheetProps {
  visible: boolean
  week: number
  availableWeeks: number[]
  onSelect: (week: number) => void
  onClose: () => void
}

// A list rather than a strip: the weeks you can actually pick are a minority of
// the eighteen, and a list says which is which without horizontal scrubbing.
export function WeekPickerSheet({
  visible,
  week,
  availableWeeks,
  onSelect,
  onClose,
}: WeekPickerSheetProps) {
  const { currentWeek: liveWeek } = useDerivedCurrentWeek()

  return (
    <Sheet visible={visible} title="Week" onClose={onClose}>
      <View>
        {availableWeeks.map(value => {
          // Past weeks are locked: their games have kicked off, and a parlay
          // cannot be built for one.
          const past = value < liveWeek
          const selected = value === week
          return (
            <Pressable
              key={value}
              disabled={past}
              onPress={() => {
                onSelect(value)
                onClose()
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: past }}
              accessibilityLabel={`Week ${value}${value === liveWeek ? ', current week' : ''}${past ? ', already played' : ''}`}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                past && styles.rowPast,
                pressed && !past && styles.pressed,
              ]}
            >
              <Text style={[styles.label, selected && styles.labelSelected]}>
                Week {value}
              </Text>
              {value === liveWeek ? <Text style={styles.now}>now</Text> : null}
              {selected ? (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={colors.primaryBright}
                  style={styles.check}
                />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: colors.surfaceRaised },
  rowPast: { opacity: 0.45 },
  pressed: { opacity: PRESSED_OPACITY },
  label: { ...typography.body, color: colors.text, flex: 1 },
  labelSelected: { fontFamily: typography.title.fontFamily },
  now: { ...typography.micro, color: colors.secondary },
  check: { marginLeft: spacing.xs },
})
