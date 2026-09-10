# Billing setup — required before selling Pro

> **Billing ships disabled.** None of these secrets are bound to the function, so
> their absence cannot block a deploy. `/billing/*` answers `503
> billing_not_configured`, `/entitlements` reports `billingAvailable: {stripe:
> false, apple: false}`, and the clients show Pro's features without an Upgrade
> button. Tiering — entitlements, quota, and every gate — works regardless.
>
> **Turning billing on takes both steps below.** Creating the secrets alone does
> nothing: they must also be bound in `functions/src/index.ts`, or Cloud
> Functions never injects them. Binding them alone puts deploys back in the
> state this design exists to prevent.

**Firebase validates every secret bound to a function before it deploys anything.**
A bound secret with no value aborts the entire deploy — functions *and* hosting,
since the hosting job depends on the functions job. `RESEND_API_KEY` did that in
#78, and `STRIPE_SECRET_KEY` did it again the moment tiering merged, freezing
production with the tiering code undeployed.

That is why billing's six are deliberately **not bound**. Create them when you
are ready to sell, and bind them in the same change.

Verify with:

```bash
gcloud secrets list --project=nfl-parlay-builder --format="value(name.basename())"
```

---

## 1. Stripe

Create the product and price in the Stripe dashboard first — a recurring monthly
price at **$4.99 USD**. Copy its price ID (`price_…`, not the product `prod_…`).

| Secret | Where it comes from |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **Secret key** (`sk_live_…`) |
| `STRIPE_PRICE_ID` | The recurring price you just created (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | Created in step 2, below (`whsec_…`) |

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project nfl-parlay-builder
firebase functions:secrets:set STRIPE_PRICE_ID --project nfl-parlay-builder
```

### 2. Stripe webhook

Add an endpoint in Stripe → Developers → Webhooks:

```
https://nfl-parlay-builder.web.app/api/billing/webhooks/stripe
```

Subscribe it to exactly these three events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

`checkout.session.completed` is deliberately **not** handled — it can fire before
the subscription is actually active, so acting on it grants Pro for a payment that
may still fail. The subscription events carry the whole lifecycle.

Copy the endpoint's signing secret and store it:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project nfl-parlay-builder
```

---

## 3. Apple

| Secret | Where it comes from |
|---|---|
| `APPLE_BUNDLE_ID` | The app's bundle identifier, e.g. `com.debugdad.parlaid` |
| `APPLE_APP_APPLE_ID` | App Store Connect → App Information → **Apple ID** (numeric) |
| `APPLE_ROOT_CA_G3` | Apple Root CA G3, PEM, base64-encoded — see below |

Download **Apple Root CA - G3** from <https://www.apple.com/certificateauthority/>
(`AppleRootCA-G3.cer`), then:

```bash
openssl x509 -inform der -in AppleRootCA-G3.cer -out AppleRootCA-G3.pem
base64 -i AppleRootCA-G3.pem | tr -d '\n' | firebase functions:secrets:set APPLE_ROOT_CA_G3 --project nfl-parlay-builder --data-file=-
```

It is a public certificate, not a credential. It lives in Secret Manager rather
than the repo only to keep a binary trust anchor out of source, where a silent
change would be easy to miss in review.

### 4. The subscription product

Create an **auto-renewable subscription** in App Store Connect whose Product ID
is exactly:

```
com.debugdad.parlaid.pro.monthly
```

It must match `PRO_PRODUCT_ID` in `mobile/src/lib/billing/iap.ts`, or StoreKit
returns no products and the purchase sheet never opens. Price it at $4.99/month.

Enrol in the **Small Business Program** if you have not — it is the difference
between Apple taking 15% and 30%, so ~$4.24 versus ~$3.49 net on $4.99.

### 5. The iOS build

Purchases go through `expo-iap`, which is a native module registered as a config
plugin in `mobile/app.json`. **Expo Go cannot run it** — the app needs a fresh
native build (`npx expo run:ios`, or an EAS build) before any purchase works.
An older build will fail at `initConnection`.

Sandbox testing needs a Sandbox Apple ID (App Store Connect → Users and Access →
Sandbox Testers), signed in on the device under Settings → Developer. Sandbox
subscriptions renew on an accelerated clock — a month is a few minutes — which
is the practical way to exercise renewal notifications.

### 6. App Store Server Notifications

In App Store Connect → your app → **App Information → App Store Server
Notifications**, set the **Version 2** production and sandbox URLs to:

```
https://nfl-parlay-builder.web.app/api/billing/webhooks/apple
```

Both environments are handled: verification tries production first, then falls
back to sandbox. Apple reviewers test sandbox purchases against a production
build, so review fails if sandbox is not accepted.

---

## Still open

- **Apple's cut is 15%** under the Small Business Program (needs enrolment;
  otherwise 30%). At $4.99 that is ~$4.24 net versus ~$4.55 on Stripe, so web
  signups are worth steering to Stripe — roughly $0.30/user/month.
- **App Store review has not been validated.** No wagering happens in the app —
  it generates picks for entertainment — so Apple's gambling rules (5.3) should
  not apply, but expect an age-rating question at review. Worth confirming before
  shipping the iOS purchase flow.
- **The purchase flow has never run against a real store.** It is written against
  expo-iap's documented API and type-checks against it, but no sandbox purchase
  has been made. Do that on a real device build before trusting it.
