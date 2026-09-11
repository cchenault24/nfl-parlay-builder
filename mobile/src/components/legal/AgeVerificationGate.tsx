import { ErrorBanner } from '@/components/ui/ErrorBanner'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HELPLINE, MINIMUM_AGE } from '@shared/legal/content'
import {
  colors,
  PRESSED_OPACITY,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'

const REQUIREMENTS = [
  `Must be ${MINIMUM_AGE}+ years old`,
  'Entertainment purposes only',
  'No actual betting occurs',
  'Content for adults only',
]

/**
 * Blocks the whole app until age is confirmed — it renders ahead of auth,
 * so no betting content is reachable beforehand.
 *
 * The web client sends a declining user to ncpgambling.org via
 * window.location. A native app has nowhere to navigate to, so declining
 * shows a terminal screen instead: the app stays blocked for this launch,
 * with the helpline one tap away.
 */
export function AgeVerificationGate({ onVerified }: { onVerified: () => void }) {
  const [agreed, setAgreed] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [error, setError] = useState('')

  if (declined) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.declined}>
          <Ionicons name="shield-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.declinedTitle} accessibilityRole="header">
            You must be {MINIMUM_AGE} or older
          </Text>
          <Text style={styles.declinedBody}>
            This app contains sports betting content and cannot be used by anyone
            under {MINIMUM_AGE}.
          </Text>
          <Button
            variant="outline"
            label="Gambling help resources"
            onPress={() => Linking.openURL('https://www.ncpgambling.org/')}
            style={styles.helpBtn}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={28} color={colors.secondary} />
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">
              Age verification required
            </Text>
            <Text style={styles.subtitle}>Legal compliance check for adult content</Text>
          </View>
        </View>

        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={18} color={colors.secondary} />
          <Text style={styles.warningText}>
            This application involves sports betting content and is restricted to
            adults only.
          </Text>
        </View>

        <Card tone="outline" style={styles.panel}>
          <Text style={styles.panelTitle}>Legal requirements</Text>
          {REQUIREMENTS.map(item => (
            <View key={item} style={styles.requirement}>
              <View style={styles.dot} />
              <Text style={styles.requirementText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.helpline}>
            Problem gambling? Call {HELPLINE} or visit gamblersanonymous.org
          </Text>
        </Card>

        <Pressable
          onPress={() => {
            setAgreed(v => !v)
            setError('')
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          style={({ pressed }) => [
            styles.checkRow,
            agreed && styles.checkRowOn,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={22}
            color={agreed ? colors.primaryBright : colors.textSecondary}
          />
          <Text style={[styles.checkLabel, agreed && styles.checkLabelOn]}>
            I confirm that I am {MINIMUM_AGE} years of age or older and understand
            this is for entertainment purposes only.
          </Text>
        </Pressable>

        {error ? <ErrorBanner type="error" message={error} /> : null}

        {/* Stays tappable while unconfirmed rather than going disabled: a
            dead button tells the user nothing about why. */}
        <Button
          label={`Continue (${MINIMUM_AGE}+)`}
          onPress={() => {
            if (!agreed) {
              setError(`You must confirm you are ${MINIMUM_AGE} or older to continue.`)
              return
            }
            onVerified()
          }}
        />

        <Button
          variant="danger"
          label={`I am under ${MINIMUM_AGE}`}
          onPress={() => setDeclined(true)}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.md, gap: spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },

  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
    padding: spacing.md,
  },
  warningText: { ...typography.bodySmall, color: colors.text, flex: 1 },

  panel: { padding: spacing.md, gap: spacing.sm },
  panelTitle: { ...typography.label, color: colors.primaryBright },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  requirementText: { ...typography.bodySmall, color: colors.textSecondary },
  helpline: { ...typography.caption, color: colors.textDisabled, marginTop: spacing.xs },

  checkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  checkRowOn: { borderColor: colors.primaryBright },
  checkLabel: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  checkLabelOn: { color: colors.text },

  helpBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg },

  declined: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  declinedTitle: { ...typography.heading, color: colors.text, textAlign: 'center' },
  declinedBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  pressed: { opacity: PRESSED_OPACITY },
})
