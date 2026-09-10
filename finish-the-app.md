# ParlAId — finish the app (v1 → v3)

## Goal
Sell Pro on web and iOS, then build out the whole `docs/TIERING.md` §5 order so every
row of the tier table is real and enforced from `/entitlements`.

## Tasks

### v1 — shippable Pro
- [ ] 1. Close the tiering gaps: apply `capabilities.historyDepth` to `getUserParlays`
  (`src/config/firebase.ts:158`, `mobile/src/lib/parlays.ts:85`), gate `TrackRecord`
  (`src/components/ParlayHistory.tsx:99`) on `capabilities.performanceRecord`, and delete
  the `exportResultCard` flag from `shared/tiering.ts` + `functions/src/tiering/capabilities.ts`
  — sharing stays free for both tiers → Verify: a free account sees at most 10 parlays and a
  locked track record, share still works on both tiers, `npm run type-check && npm run lint`
  clean in root, `functions/`, and `mobile/`
- [ ] 2. Amend `docs/TIERING.md`: sharing moves to Both in §2, a §8 decision row records why,
  and §9's rate/price rows get answers — read the real `gpt-5.6-terra` rate into §4 and settle
  $4.99 vs $9.99 → Verify: no §9 row still says "unconfirmed"; §4's break-even table has the
  actual rate marked
- [ ] 3. Turn Stripe on: create the recurring price, set `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` /
  `STRIPE_WEBHOOK_SECRET`, add the webhook endpoint, and bind all three in
  `functions/src/index.ts` **in the same change** → Verify: `/entitlements` reports
  `billingAvailable.stripe: true`, a live checkout flips the account to Pro via
  `customer.subscription.created`, Deploy Production green
- [ ] 4. Validate iOS before building the purchase path: create the EAS project, produce a native
  build with billing still off, and put the age-rating / guideline 5.3 question to App Review →
  Verify: an approved TestFlight build or a written answer from Apple in hand
- [ ] 5. Ship iOS purchases: `APPLE_BUNDLE_ID` / `APPLE_APP_APPLE_ID` / `APPLE_ROOT_CA_G3` set and
  bound, the `com.debugdad.parlaid.pro.monthly` subscription created, Server Notification v2 URLs
  pointed at `/api/billing/webhooks/apple`, Small Business Program enrolled → Verify: a sandbox
  purchase on a device build grants Pro, an accelerated sandbox renewal updates `entitlements/{uid}`,
  app approved

### v2 — depth
- [ ] 6. Anchored player props: upgrade the Odds API plan, fetch `player_*` markets per event in
  `functions/src/providers/odds/client.ts`, teach `utils/bookLines.ts` and the orchestrator's
  line-snapping to price them, and label anchored vs estimated legs in both clients → Verify: a Pro
  prop leg carries a real `bookmaker` + price, and `computeClosingLines` returns CLV for it rather
  than `unavailable: 'unanchored'`
- [ ] 7. Rejected legs: add a rejected-candidates array to `functions/src/service/ai/schemas.ts` and
  `promptBuilder.ts`, persist it on the run result, render it behind `capabilities.rejectedLegs` →
  Verify: a Pro run shows at least one rejected leg with a reason; a free run shows none and the
  prompt does not ask for them

### v3 — breadth
- [ ] 8. Entitlement budgets + priority queue: add a per-batch run budget to `TierCapabilities` and
  enforce it in `POST /agent/runs` alongside the weekly quota, and give Pro claim priority when
  runs contend → Verify: a batch past budget is refused with its own error code, a within-budget
  batch decrements the quota once per successful run, and a Pro run claims ahead of a free one
- [ ] 9. Cross-game + full-slate: accept `gameIds` on run creation, fan out in the orchestrator on
  one odds fetch per slate, scope `validate.ts`'s one-leg-per-market rule per game, and add the
  slate UI → Verify: a 3-game parlay validates and grades, a full-slate click produces one run per
  game under the task-8 budget
- [ ] 10. Line-move alerts: build the delivery channel first — nothing exists since the
  kickoff-reminder removal — then a sweep beside `captureClosingLines` comparing each saved
  parlay's anchored price to the current one, gated on `capabilities.lineMoveAlerts` → Verify: a
  seeded line move alerts one Pro user exactly once and never a free one

## Done When
- [ ] Pro is purchasable on web and iOS, and every row of the `docs/TIERING.md` §2 table is
  enforced by capabilities served from `/entitlements` — no flag declared and unread
- [ ] §5's v1/v2/v3 order is fully built and §9 is empty

## Notes
- Branch each task off `main`, one PR per task, conventional commits. `main` needs a review, so
  Christian merges.
- `c5d0e5b` (perf(dev): concurrent local secrets) is on `fix/billing-optional` only — it missed
  PR #87 and needs its own PR or a cherry-pick.
- **Never bind a secret before its value exists.** An unset bound secret aborts the whole deploy,
  functions *and* hosting — `RESEND_API_KEY` did it in #78 and `STRIPE_SECRET_KEY` again at #86.
- Task 4 gates task 5. Task 6 needs a paid Odds API plan and props are per-event fetches, so watch
  the credit burn against `CacheClient`. Task 10 needs a notification channel built from scratch.
- No tests again this pass — manual emulator + browser verification, same as the v1 takeover.
  Quota accounting and the billing webhooks are the parts that will bite.
- History depth is a view restriction, not a boundary: `firestore.rules` lets a user read all their
  own parlays, so the `limit()` is honest UI, not enforcement.
