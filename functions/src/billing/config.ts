// Billing configuration, read from the environment rather than declared with
// defineSecret().
//
// That is deliberate. Firebase validates every secret bound to a function before
// it deploys anything, so one missing value aborts the whole run — functions AND
// hosting, since the hosting job depends on the functions job. RESEND_API_KEY
// did exactly that in #78, and STRIPE_SECRET_KEY did it again the moment tiering
// merged, freezing production with the tiering code undeployed.
//
// Billing is not ready to sell yet, and an unfinished payment integration must
// not be able to hold every future deploy hostage. So nothing here is bound to
// the function: the values are absent in production today, `billingConfigured()`
// is false, and the /billing routes answer 503 while the rest of the app — the
// entitlements, the quota, every gate — is unaffected.
//
// TO TURN BILLING ON, both steps are required:
//   1. Create the six secrets (see docs/BILLING_SETUP.md).
//   2. Bind them in functions/src/index.ts, so Cloud Functions injects them:
//      import defineSecret from firebase-functions/params, declare one param
//      per name below, and add them to the api function's `secrets` array
//      alongside OPENAI_API_KEY and ODDS_API_KEY.
//      (Deliberately not written as real calls here: start-dev.js scans this
//      source for defineSecret param declarations to decide what to fetch
//      locally, and a regex cannot tell an example in a comment from the real
//      thing — an example here would make it chase a secret that does not
//      exist.)
//      Step 1 without step 2 leaves the values unavailable at runtime; step 2
//      without step 1 puts the deploy back in the state this exists to prevent.

const BILLING_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'APPLE_ROOT_CA_G3',
  'APPLE_BUNDLE_ID',
  'APPLE_APP_APPLE_ID',
] as const

type BillingEnvVar = (typeof BILLING_ENV_VARS)[number]

// start-dev.js writes this in place of a secret it could not fetch, so the
// emulator can load every function instead of 403-ing on one. It is a stub, not
// a credential — treating it as configured would send garbage to Stripe and
// turn a clean 503 into a confusing 500. Keep in sync with start-dev.js.
const MISSING_SENTINEL = 'missing-locally'

function configured(name: BillingEnvVar): boolean {
  const value = process.env[name]
  return !!value && value !== MISSING_SENTINEL
}

// Read at call time, never at module load: a secret's value only exists once the
// function is running, so binding it at import would capture whatever was set
// during deploy analysis.
export function billingSecret(name: BillingEnvVar): string {
  const value = process.env[name]
  if (!value || value === MISSING_SENTINEL) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

// Stripe and Apple are independently configurable — web checkout can be live
// while iOS is still waiting on App Store Connect, which is exactly the order
// they will arrive in.
export function stripeConfigured(): boolean {
  return (
    configured('STRIPE_SECRET_KEY') &&
    configured('STRIPE_WEBHOOK_SECRET') &&
    configured('STRIPE_PRICE_ID')
  )
}

export function appleConfigured(): boolean {
  return (
    configured('APPLE_ROOT_CA_G3') &&
    configured('APPLE_BUNDLE_ID') &&
    configured('APPLE_APP_APPLE_ID')
  )
}

export function billingConfigured(): boolean {
  return stripeConfigured() || appleConfigured()
}

// Which values are missing, for the startup log — so an operator can see why
// billing is off without reading code.
export function missingBillingVars(): string[] {
  return BILLING_ENV_VARS.filter(name => !configured(name))
}

// Where Stripe sends the browser back to. Checkout requires absolute URLs, and
// the deployed origin is the Hosting site rather than the function's own URL.
export const WEB_ORIGIN = 'https://nfl-parlay-builder.web.app'
