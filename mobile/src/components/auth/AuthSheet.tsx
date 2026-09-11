import { SheetHeader } from '@/components/ui/SheetHeader'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { AppleSignInButton } from '@/components/auth/AppleSignInButton'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { googleSignInConfigured } from '@/lib/auth/useGoogleSignIn'
import { requestPasswordReset, signInWithEmail, signUpWithEmail } from '@/lib/firebase'
import { colors, MIN_TARGET, radius, spacing, typography } from '@/lib/theme/designTokens'
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
  const [notice, setNotice] = useState('')

  // Reset on open, adjusted during render rather than in an effect. An effect
  // would paint one frame of the previous session's mode and error before
  // correcting itself, and the sheet animates in on exactly that frame.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setIsSignUp(startOnSignUp)
      setError('')
      setNotice('')
    }
  }

  const reset = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setNotice('')
  }

  // The only way back into an account whose password is gone; without it a
  // locked-out user's one recourse was deleting nothing and emailing support.
  const forgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above first, and we will send a reset link.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await requestPasswordReset(email.trim())
      setNotice(`If an account uses ${email.trim()}, a reset link is on its way.`)
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
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
        <SheetHeader
          title={isSignUp ? 'Create account' : 'Sign in'}
          onClose={onClose}
        />

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? (
            <ErrorBanner type="error" message={error} />
          ) : null}
          {notice ? <ErrorBanner type="success" message={notice} /> : null}

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
              returnKeyType="go"
              onSubmitEditing={isSignUp ? undefined : submit}
            />
            {isSignUp ? null : (
              <LinkButton
                role="button"
                label="Forgot password?"
                onPress={() => void forgotPassword()}
                style={styles.forgot}
              />
            )}
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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          {/* Apple first, and never below Google: review expects it to be at
              least as prominent as any other third-party option. */}
          <AppleSignInButton onError={msg => setError(msg ?? '')} />
          {googleSignInConfigured ? (
            <GoogleSignInButton onError={msg => setError(msg ?? '')} />
          ) : null}

          <LinkButton
            role="button"
            label={
              isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"
            }
            onPress={() => {
              setIsSignUp(v => !v)
              setError('')
              setNotice('')
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
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
    minHeight: MIN_TARGET,
  },
  forgot: { alignSelf: 'flex-end' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { ...typography.bodySmall, color: colors.textSecondary },
})
