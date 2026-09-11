import { Button } from '@/components/ui/Button'
import { useGoogleSignIn } from '@/lib/auth/useGoogleSignIn'

// Only mount this when googleSignInConfigured is true — the auth-session hook
// inside useGoogleSignIn throws during render without an iOS client id.
//
// Built from Button rather than hand-rolled. The previous version reproduced
// Button's geometry property for property and its `neutral` outline, differing
// only by a fill — and had no busy state at all, so a user who tapped twice
// during the browser round trip got no feedback either time.
export function GoogleSignInButton({
  onError,
}: {
  onError: (message: string | null) => void
}) {
  const google = useGoogleSignIn(onError)

  return (
    <Button
      variant="neutral"
      icon="logo-google"
      label="Continue with Google"
      loading={google.disabled}
      onPress={google.signIn}
    />
  )
}
