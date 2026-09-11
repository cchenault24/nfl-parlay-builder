import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  // A locked segment stays visible and legible — the conversion moment is a
  // control the user already wants, not an empty state.
  locked?: boolean
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  onLockedPress?: (option: SegmentedOption<T>) => void
  accessibilityLabel: string
}

/**
 * Equal-width single-select control.
 *
 * The width is set on the *wrapper* of each segment. This is the whole bug the
 * component exists to prevent: `flex: 1` on the Pressable alone does nothing
 * when the Pressable sits inside a shrink-to-fit parent, so the segments
 * collapse onto their text and the labels run together with no padding.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  onLockedPress,
  accessibilityLabel,
}: SegmentedProps<T>) {
  return (
    <View
      style={styles.track}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option, index) => {
        const active = option.value === value && !option.locked
        return (
          <View key={option.value} style={styles.slot}>
            {index > 0 ? <View style={styles.seam} /> : null}
            <Pressable
              onPress={() =>
                option.locked ? onLockedPress?.(option) : onChange(option.value)
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: option.locked }}
              accessibilityLabel={
                option.locked ? `${option.label}. Pro feature` : option.label
              }
              style={({ pressed }) => [
                styles.segment,
                active && styles.segmentActive,
                pressed && styles.pressed,
              ]}
            >
              {option.locked ? (
                <Ionicons
                  name="lock-closed"
                  size={10}
                  color={colors.secondary}
                  style={styles.lock}
                />
              ) : null}
              <Text
                style={[
                  styles.label,
                  active && styles.labelActive,
                  option.locked && styles.labelLocked,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {option.label}
              </Text>
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  // The equal-width slot. Without this the segments size to their labels.
  slot: { flex: 1, flexBasis: 0 },
  seam: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: MIN_TARGET,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  segmentActive: { backgroundColor: colors.primary },
  pressed: { opacity: PRESSED_OPACITY },
  lock: { marginTop: 1 },
  label: { ...typography.label, color: colors.textSecondary, textAlign: 'center' },
  labelActive: { color: colors.text, fontFamily: typography.title.fontFamily },
  labelLocked: { color: colors.textDisabled },
})
