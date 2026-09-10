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
//        import { defineSecret } from 'firebase-functions/params'
//        const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')   // ...etc
//        secrets: [OPENAI_API_KEY, ODDS_API_KEY, STRIPE_SECRET_KEY, ...]
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

// Read at call time, never at module load: a secret's value only exists once the
// function is running, so binding it at import would capture whatever was set
// during deploy analysis.
export function billingSecret(name: BillingEnvVar): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

// Stripe and Apple are independently configurable — web checkout can be live
// while iOS is still waiting on App Store Connect, which is exactly the order
// they will arrive in.
export function stripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_ID
  )
}

export function appleConfigured(): boolean {
  return !!(
    process.env.APPLE_ROOT_CA_G3 &&
    process.env.APPLE_BUNDLE_ID &&
    process.env.APPLE_APP_APPLE_ID
  )
}

export function billingConfigured(): boolean {
  return stripeConfigured() || appleConfigured()
}

// Which values are missing, for the startup log — so an operator can see why
// billing is off without reading code.
export function missingBillingVars(): string[] {
  return BILLING_ENV_VARS.filter(name => !process.env[name])
}

// Where Stripe sends the browser back to. Checkout requires absolute URLs, and
// the deployed origin is the Hosting site rather than the function's own URL.
export const WEB_ORIGIN = 'https://nfl-parlay-builder.web.app'
