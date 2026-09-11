import { ErrorBanner } from '@/components/ui/ErrorBanner'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button } from '@/components/ui/Button'
import { googleSignInConfigured } from '@/lib/auth/useGoogleSignIn'
import { signInWithEmail, signUpWithEmail } from '@/lib/firebase'
import {
  colors,
  HIT_SLOP,
  radius,
  spacing,
  typography,
} from '@/lib/theme/designTokens'
import { readableAuthError } from '@/lib/auth/authErrors'

interface AuthSheetProps {
  visible: boolean
  startOnSignUp: boolean
  onClose: () => void
}

export function AuthSheet({ visible, startOnSignUp, onClose }: AuthSheetProps) {
  const [isSignUp, setIsSignUp] = useState(startOnSignUp)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset on open, adjusted during render rather than in an effect. An effect
  // would paint one frame of the previous session's mode and error before
  // correcting itself, and the sheet animates in on exactly that frame.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setIsSignUp(startOnSignUp)
      setError('')
    }
  }

  const reset = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const submit = async () => {
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
      reset()
      onClose()
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {isSignUp ? 'Create account' : 'Sign in'}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? (
            <ErrorBanner type="error" message={error} />
          ) : null}

          <View style={styles.field}>
            <Text style={styles.fieldLabel} nativeID="auth-email">
              Email
            </Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Email"
              accessibilityLabelledBy="auth-email"
              placeholder="you@example.com"
              placeholderTextColor={colors.textDisabled}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel} nativeID="auth-password">
              Password
            </Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Password"
              accessibilityLabelledBy="auth-password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </View>

          {isSignUp ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel} nativeID="auth-confirm">
                Confirm password
              </Text>
              <TextInput
                style={styles.input}
                accessibilityLabel="Confirm password"
                accessibilityLabelledBy="auth-confirm"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>
          ) : null}

          <Button
            label={isSignUp ? 'Create account' : 'Sign in'}
            onPress={submit}
            loading={loading}
          />

          {googleSignInConfigured ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <GoogleSignInButton onError={msg => setError(msg ?? '')} />
            </>
          ) : null}

          <Pressable
            onPress={() => setIsSignUp(v => !v)}
            accessibilityRole="button"
            hitSlop={HIT_SLOP}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  title: { ...typography.heading, color: colors.text },
  body: { padding: spacing.md, gap: spacing.md },

  field: { gap: spacing.xs },
  fieldLabel: { ...typography.label, color: colors.textSecondary },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.sunken,
    borderWidth: 1,
    // A form control's boundary has to clear 3:1 on its own — the structural
    // hairline is invisible at input size.
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { ...typography.bodySmall, color: colors.textSecondary },



  switch: { paddingVertical: spacing.sm },
  switchText: {
    ...typography.bodySmall,
    color: colors.primaryBright,
    textAlign: 'center',
  },
})
