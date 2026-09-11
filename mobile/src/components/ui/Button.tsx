import Ionicons from '@expo/vector-icons/Ionicons'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import {
  colors,
  MIN_TARGET,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

export type ButtonVariant =
  | 'primary'
  // Bordered, brand-tinted — a real secondary action.
  | 'outline'
  // Bordered, neutral — present but not competing (Sign out).
  | 'neutral'
  // Borderless red. Destructive actions are marked by colour, not by weight:
  // an outlined red button pulls more attention than the safe action beside
  // it, which is exactly backwards for something irreversible.
  | 'danger'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  icon?: keyof typeof Ionicons.glyphMap
  // Square, icon-only: `label` becomes the accessible name rather than type.
  // Only for actions whose icon is unambiguous on its own (a trash can).
  iconOnly?: boolean
  loading?: boolean
  disabled?: boolean
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

const TINT: Record<ButtonVariant, string> = {
  primary: colors.text,
  outline: colors.primaryBright,
  neutral: colors.text,
  danger: colors.error,
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconOnly = false,
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const inert = disabled || loading
  // A disabled control has to lose its colour, not just its background: the
  // old one kept full-white type on a grey fill and still read as tappable.
  const tint = inert ? colors.textDisabled : TINT[variant]

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        iconOnly && styles.iconOnly,
        styles[variant],
        inert && styles[`${variant}Disabled`],
        pressed && !inert && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={iconOnly ? 22 : 20} color={tint} /> : null}
          {iconOnly ? null : (
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TARGET + 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  iconOnly: { width: MIN_TARGET + 8, paddingHorizontal: 0 },
  label: { ...typography.button },
  pressed: { opacity: PRESSED_OPACITY },

  primary: { backgroundColor: colors.primary },
  primaryDisabled: { backgroundColor: colors.surfaceRaised },

  outline: { borderWidth: 1, borderColor: colors.primaryBright },
  outlineDisabled: { borderWidth: 1, borderColor: colors.divider },

  neutral: { borderWidth: 1, borderColor: colors.border },
  neutralDisabled: { borderWidth: 1, borderColor: colors.divider },

  // Empty on purpose, and required: `danger` is borderless by design — marked
  // by colour through TINT rather than by weight — but the lookup below indexes
  // styles by variant, so every variant needs an entry.
  danger: {},
  dangerDisabled: {},
})
