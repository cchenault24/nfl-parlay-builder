import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect } from 'react'
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

export type ErrorBannerType =
  | 'rate_limit_reached'
  | 'error'
  | 'info'
  | 'success'

const TONE: Record<ErrorBannerType, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  rate_limit_reached: { color: colors.warning, icon: 'time-outline' },
  error: { color: colors.error, icon: 'alert-circle-outline' },
  info: { color: colors.info, icon: 'information-circle-outline' },
  success: { color: colors.success, icon: 'checkmark-circle-outline' },
}

interface ErrorBannerProps {
  type: ErrorBannerType
  title?: string
  message: string
  countdown?: string
}

export function ErrorBanner({ type, title, message, countdown }: ErrorBannerProps) {
  const tone = TONE[type]
  // Only a failure interrupts. `accessibilityLiveRegion` is Android-only, so
  // VoiceOver hears it through an explicit announcement.
  const urgent = type === 'error' || type === 'rate_limit_reached'

  useEffect(() => {
    if (urgent) {
      AccessibilityInfo.announceForAccessibility(title ? `${title}. ${message}` : message)
    }
  }, [urgent, title, message])

  return (
    <View
      style={[styles.banner, { borderColor: tone.color }]}
      accessibilityRole={urgent ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={tone.icon} size={18} color={tone.color} style={styles.icon} />
      <View style={styles.text}>
        {title ? <Text style={[styles.title, { color: tone.color }]}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
        {countdown ? (
          <Text style={[styles.countdown, { color: tone.color }]}>{countdown}</Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.sunken,
  },
  icon: { marginTop: 1 },
  text: { flex: 1, gap: spacing.xs },
  title: { ...typography.label },
  message: { ...typography.bodySmall, color: colors.textSecondary },
  countdown: { ...typography.numericSmall },
})
