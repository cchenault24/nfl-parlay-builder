import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import {
  ActivityIndicator,
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
import { googleSignInConfigured } from '@/lib/auth/useGoogleSignIn'
import { signInWithEmail, signUpWithEmail } from '@/lib/firebase'
import { colors, radius, spacing, typography } from '@/lib/theme/designTokens'

interface FirebaseAuthError {
  code?: string
  message?: string
}

// Matches the web AuthModal: turn `auth/invalid-credential` into
// `invalid credential` rather than showing a raw Firebase code.
function readableAuthError(err: unknown): string {
  const authError = err as FirebaseAuthError
  return (
    authError.code?.replace('auth/', '').replace(/-/g, ' ') ||
    authError.message ||
    'Authentication failed'
  )
}

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
          <Text style={styles.title}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textDisabled}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textDisabled}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {isSignUp ? (
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={colors.textDisabled}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || loading) && styles.pressed,
            ]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignUp ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </Pressable>

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

          <Pressable onPress={() => setIsSignUp(v => !v)} hitSlop={8}>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { ...typography.h3, color: colors.text },
  body: { padding: spacing.md, gap: spacing.md },

  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: 52,
  },
  primaryBtnText: { ...typography.button, color: colors.text },
  pressed: { opacity: 0.75 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { ...typography.bodySmall, color: colors.textSecondary },


  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { ...typography.bodySmall, color: colors.error },

  switchText: {
    ...typography.bodySmall,
    color: colors.primary,
    textAlign: 'center',
  },
})
