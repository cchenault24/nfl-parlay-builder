import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

export interface StripOption<T extends string | number> {
  value: T
  label: string
  // Sits under the label — "now" on the current week.
  caption?: string
  // `accent` marks something worth looking at ("now"); `muted` explains why a
  // chip is unavailable, where orange would read as a warning about the game
  // rather than a statement about the book.
  captionTone?: 'muted'
  disabled?: boolean
  locked?: boolean
}

interface ChipStripProps<T extends string | number> {
  options: readonly StripOption<T>[]
  value: T
  onChange: (value: T) => void
  accessibilityLabel: string
  // Fixed-width chips read as a row of equals (weeks); content-width chips let
  // a long label stay on one line (sportsbooks).
  chipWidth?: number
  // Mirrors Segmented: a locked chip stays selectable-looking and offers the
  // upgrade rather than setting a value the server would refuse.
  onLockedPress?: (option: StripOption<T>) => void
}

/**
 * Horizontally scrolling single-select. Used where the options are too many or
 * too unevenly sized for `Segmented` — a five-up segmented control is what
 * forced "Best available" to wrap onto two lines.
 */
export function ChipStrip<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  chipWidth,
  onLockedPress,
}: ChipStripProps<T>) {
  const scrollRef = useRef<ScrollView>(null)
  const index = options.findIndex(o => o.value === value)

  useEffect(() => {
    if (index < 0 || !chipWidth) {
      return
    }
    // Keep the selection roughly centred rather than off-screen left.
    scrollRef.current?.scrollTo({
      x: Math.max(0, index * (chipWidth + spacing.sm) - chipWidth),
      animated: true,
    })
  }, [index, chipWidth])

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map(option => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            disabled={option.disabled}
            onPress={() =>
              option.locked && onLockedPress
                ? onLockedPress(option)
                : onChange(option.value)
            }
            accessibilityRole="radio"
            accessibilityState={{
              checked: selected,
              disabled: option.disabled || option.locked,
            }}
            accessibilityLabel={
              option.locked ? `${option.label}. Pro feature` : option.label
            }
            style={({ pressed }) => [
              styles.chip,
              chipWidth ? { width: chipWidth } : null,
              selected && styles.chipSelected,
              option.disabled && styles.chipDisabled,
              pressed && !option.disabled && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                selected && styles.labelSelected,
                option.locked && styles.labelLocked,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.locked ? (
              <Ionicons name="lock-closed" size={10} color={colors.textDisabled} />
            ) : option.caption ? (
              <Text
                style={[
                  styles.caption,
                  option.captionTone === 'muted' && styles.captionMuted,
                ]}
              >
                {option.caption}
              </Text>
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  strip: { gap: spacing.sm, paddingVertical: spacing.xxs },
  chip: {
    minHeight: MIN_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  // Selected is carried by fill *and* border, so it survives greyscale and
  // does not depend on the green alone.
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primaryBright },
  chipDisabled: { opacity: 0.45 },
  pressed: { opacity: PRESSED_OPACITY },
  label: { ...typography.label, color: colors.textSecondary },
  labelSelected: { color: colors.text, fontFamily: typography.title.fontFamily },
  labelLocked: { color: colors.textDisabled },
  caption: { ...typography.micro, color: colors.secondary },
  captionMuted: { color: colors.textDisabled },
})
