import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

export type ErrorBannerType =
  | 'rate_limit_reached'
  | 'rate_limit_warning'
  | 'error'
  | 'info'
  | 'success'

const TONE: Record<ErrorBannerType, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  rate_limit_reached: { color: colors.warning, icon: 'time-outline' },
  rate_limit_warning: { color: colors.info, icon: 'time-outline' },
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
  return (
    <View style={[styles.banner, { borderColor: tone.color }]}>
      <Ionicons name={tone.icon} size={18} color={tone.color} style={styles.icon} />
      <View style={styles.text}>
        {title ? <Text style={[styles.title, { color: tone.color }]}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
        {countdown ? <Text style={[styles.countdown, { color: tone.color }]}>{countdown}</Text> : null}
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
    backgroundColor: colors.surface,
  },
  icon: { marginTop: 1 },
  text: { flex: 1, gap: spacing.xs },
  title: { ...typography.label },
  message: { ...typography.bodySmall, color: colors.textSecondary },
  countdown: { ...typography.numeric, fontSize: 13 },
})
