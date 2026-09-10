import { defineSecret } from 'firebase-functions/params'

// Every secret named here is validated by Firebase before it deploys anything —
// one that does not exist aborts the whole deploy, functions and hosting alike.
// That is what stalled four merges behind RESEND_API_KEY, so all of these must
// exist in Secret Manager before this code merges. See docs/BILLING_SETUP.md.
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')
export const STRIPE_PRICE_ID = defineSecret('STRIPE_PRICE_ID')

// Apple's public root CA, PEM, base64-encoded so it survives Secret Manager as
// a single line. It is not confidential — it lives here rather than in the repo
// only to keep a binary trust anchor out of source, where a silent change would
// be easy to miss in review.
export const APPLE_ROOT_CA_G3 = defineSecret('APPLE_ROOT_CA_G3')
export const APPLE_BUNDLE_ID = defineSecret('APPLE_BUNDLE_ID')
export const APPLE_APP_APPLE_ID = defineSecret('APPLE_APP_APPLE_ID')

export const BILLING_SECRETS = [
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID,
  APPLE_ROOT_CA_G3,
  APPLE_BUNDLE_ID,
  APPLE_APP_APPLE_ID,
]

// Where Stripe sends the browser back to. Checkout requires absolute URLs, and
// the deployed origin is the Hosting site rather than the function's own URL.
export const WEB_ORIGIN = 'https://nfl-parlay-builder.web.app'
