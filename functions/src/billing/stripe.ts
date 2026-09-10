import Stripe from 'stripe'
import { log } from '../observability/logger'
import { getEntitlement, setEntitlement, setStripeCustomer } from '../tiering/store'
import {
  STRIPE_PRICE_ID,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  WEB_ORIGIN,
} from './config'

// Constructed per call rather than at module load: secret values are only
// available once the function is running, and reading them at import time would
// bind whatever was set during deploy analysis.
function stripe(): Stripe {
  return new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2026-08-26.dahlia' })
}

// One Stripe customer per uid, remembered so a returning subscriber does not
// accumulate duplicates — Stripe will happily create a second customer with the
// same email, and then the portal shows only half their history.
async function customerFor(uid: string, email?: string): Promise<string> {
  const existing = await getEntitlement(uid)
  if (existing.stripeCustomerId) {
    return existing.stripeCustomerId
  }
  const customer = await stripe().customers.create({
    email,
    metadata: { uid },
  })
  await setStripeCustomer(uid, customer.id)
  return customer.id
}

export async function createCheckoutSession(
  uid: string,
  email: string | undefined
): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: await customerFor(uid, email),
    line_items: [{ price: STRIPE_PRICE_ID.value(), quantity: 1 }],
    // Both of these carry the uid so a webhook never has to guess who paid.
    // client_reference_id covers the session; subscription_data.metadata rides
    // along onto the subscription itself, which is what later events are about.
    client_reference_id: uid,
    subscription_data: { metadata: { uid } },
    success_url: `${WEB_ORIGIN}/?checkout=success`,
    cancel_url: `${WEB_ORIGIN}/?checkout=canceled`,
  })
  if (!session.url) {
    throw new Error('Stripe returned a session with no URL')
  }
  return session.url
}

// Stripe's hosted portal handles cancellation, plan changes and card updates, so
// none of that needs building or maintaining here.
export async function createPortalSession(uid: string): Promise<string> {
  const entitlement = await getEntitlement(uid)
  if (!entitlement.stripeCustomerId) {
    throw new Error('No Stripe customer for this user')
  }
  const session = await stripe().billingPortal.sessions.create({
    customer: entitlement.stripeCustomerId,
    return_url: WEB_ORIGIN,
  })
  return session.url
}

// Stripe statuses that mean the subscription is live and should grant Pro.
// Everything else — canceled, unpaid, incomplete, incomplete_expired, paused —
// does not. `past_due` deliberately still grants: the card failed but Stripe is
// still retrying, and revoking access mid-dunning punishes a user whose payment
// will most likely go through.
const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
])

function uidFrom(subscription: Stripe.Subscription): string | undefined {
  return subscription.metadata?.uid
}

async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const uid = uidFrom(subscription)
  if (!uid) {
    // Nothing to apply this to. Logged rather than thrown so Stripe still gets
    // a 2xx and stops retrying an event that will never succeed.
    log.error('billing.stripe.subscription_without_uid', {
      correlationId: subscription.id,
      error: { code: 'missing_uid', message: 'Subscription metadata has no uid' },
    })
    return
  }

  const active = ACTIVE_STATUSES.has(subscription.status)
  // A subscription set to cancel keeps Pro until the period actually ends —
  // they paid for it. Nothing is ever deleted, so this restricts the view at
  // that instant and resubscribing restores it.
  const endsAt =
    active && subscription.cancel_at_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : undefined

  await setEntitlement(uid, {
    tier: active ? 'pro' : 'free',
    source: 'stripe',
    stripeCustomerId:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    ...(endsAt ? { accessEndsAt: endsAt } : { accessEndsAt: null }),
  })

  log.info('billing.stripe.applied', {
    correlationId: subscription.id,
    uid,
    status: subscription.status,
    tier: active ? 'pro' : 'free',
    endsAt,
  })
}

// Verifies the signature against the raw request body. This is why the webhook
// route is mounted with express.raw ahead of the JSON parser — re-serializing a
// parsed body changes the bytes and the signature no longer matches.
export function verifyStripeEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return stripe().webhooks.constructEvent(
    rawBody,
    signature,
    STRIPE_WEBHOOK_SECRET.value()
  )
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Subscription lifecycle is the whole story: created covers a new
    // subscriber, updated covers renewal, cancellation-at-period-end and
    // payment failure, deleted covers the end. checkout.session.completed is
    // deliberately not handled — it fires before the subscription is
    // necessarily active, and acting on it can grant Pro for a payment that
    // then fails.
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await applySubscription(event.data.object)
      return
    default:
      log.info('billing.stripe.ignored', {
        correlationId: event.id,
        type: event.type,
      })
  }
}
