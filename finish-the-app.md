# ParlAId — finish the app (v1 → v3)

## Goal
Sell Pro on web and iOS, then build out the whole `docs/TIERING.md` §5 order so every
row of the tier table is real and enforced from `/entitlements`.

Status at 2026-09-11: v1 task 1 is done, task 4 is done bar the submission itself,
and tasks 2, 3 and 5 are waiting on decisions and credentials only Christian has.

## Tasks

### v1 — shippable Pro
- [x] 1. Close the tiering gaps (#92): `capabilities.historyDepth` caps the list on both
  clients, `performanceRecord` locks `TrackRecord`, and `exportResultCard` is deleted —
  sharing is free on both tiers → Verified in the emulator against 12 seeded parlays: free
  saw 10 and a locked record, Pro saw all 12 unlocked
- [ ] 2. Amend `docs/TIERING.md` — **half done**
  - [x] sharing moved to Both in §2 with a §8 decision row, and §9's stuck-`running` item
    closed (#81 had already fixed it)
  - [ ] read the real `gpt-5.6-terra` rate into §4 — **Christian only**, it is on his OpenAI
    dashboard
  - [ ] settle $4.99 vs $9.99 — **Christian only**, and it gates task 3: changing the price
    after a Stripe product exists means a new price object and a migration
- [ ] 3. Turn Stripe on: create the recurring price, set `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` /
  `STRIPE_WEBHOOK_SECRET`, add the webhook endpoint, and bind all three in
  `functions/src/index.ts` **in the same change** → Verify: `/entitlements` reports
  `billingAvailable.stripe: true`, a live checkout flips the account to Pro via
  `customer.subscription.created`, Deploy Production green
- [ ] 4. Validate iOS before building the purchase path — **done bar the submission**
  - [x] EAS project `@cchenault24/parlaid` linked, `eas.json` with four profiles, all seven
    `EXPO_PUBLIC_*` values pushed to EAS environments rather than the public repo (#93, #96)
  - [x] production `.ipa` built and verified: the env values are inlined and the startup crash
    guard is gone (#92 fixed a release-only crash that would have failed review on launch)
  - [x] App Store Connect record `6810802163`, bundle `com.debugdad.parlaid`, name **ParlAId**
    confirmed available, subtitle, Sports/Entertainment, age rating **18+**
  - [x] demo account `appreview@debugdad.com`, Pro by manual entitlement, verified end to end
    against the deployed API
  - [x] five 1320×2868 screenshots captured from the shipped design with real anchored
    DraftKings prices
  - [ ] upload screenshots + metadata, answer **Content Rights** (NFL marks — a licensing
    question, Christian's call), submit with the drafted review notes
  - [ ] Apple's answer on the age rating / guideline 5.3 question
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
  - Now user-visible: with odds working, Pro runs return props at an estimated -110 beside
    anchored market legs, and the UI labels them "Estimate". That disclosure is correct but it
    is also an advertisement for this task.
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

## Landed 2026-09-10/11, unplanned
Found while doing tasks 1 and 4. Each was a submission blocker or a live production fault.

- **The odds tool had never once worked in production** (#98). `ODDS_API_KEY` was stored as 33
  bytes — the key plus a trailing `\n` — which URL-encodes to `%0A`, so The Odds API answered
  `401 INVALID_KEY` on every request the deployed function ever made. Every parlay the app had
  produced used AI-estimated prices, never posted book lines. Every check from a terminal passed
  because `$(...)` strips trailing newlines, so the obvious test was testing bytes the function
  never sees. Trimmed at the read, which also covers the closing-line sweep.
- **A release-only startup crash** (#91/#92). `firebase.ts` read its six `EXPO_PUBLIC_*` values
  through a computed `process.env[name]`; `babel-preset-expo` only substitutes literal
  expressions, and `@expo/metro-config` only injects a runtime `process.env` when `dev` is true.
  The app worked in the emulator and would have died on launch in TestFlight.
- **Every default Pro generation failed** (#97). Run creation defaulted `legCount` to
  `capabilities.legCount.min`, which is 2 for Pro; the model returned 3 and `validate` rejected
  the draft. `legCount` now carries an explicit server-owned `default`.
- **No in-app account deletion** (#95) — Guideline 5.1.1(v), a near-certain rejection. Shared
  links survive deletion because they were already independent copies carrying no uid, and
  deletion is refused while Pro is live since neither store cancels on account removal.
- **No privacy policy or support URL** (#93/#94). Both were dialogs, not pages; App Store Connect
  requires reachable URLs and the app could not have been submitted at all.
- **Three faults behind one error string** (#100). A leg-count mismatch, a leg with no price and
  a player prop with no player all reached the user as the same eleven words.
- **Nothing linted `mobile/`** (#91). Committing a config surfaced the crash above plus two real
  bugs: a previous user's profile surviving into the next session, and a listener that could
  never clear a stale error.
- **iOS design pass** (#99), by a parallel session.

## Done When
- [ ] Pro is purchasable on web and iOS, and every row of the `docs/TIERING.md` §2 table is
  enforced by capabilities served from `/entitlements` — no flag declared and unread
- [ ] §5's v1/v2/v3 order is fully built and §9 is empty

## Notes
- Branch each task off `main`, one PR per task, conventional commits. `main` needs a review, so
  Christian merges.
- **Never bind a secret before its value exists.** An unset bound secret aborts the whole deploy,
  functions *and* hosting — `RESEND_API_KEY` did it in #78 and `STRIPE_SECRET_KEY` again at #86.
- **Check secrets byte for byte.** `firebase functions:secrets:access X | xxd` — not
  `$(...)`, which eats the trailing newline you are looking for. That one cost hours.
- Task 4's remaining items gate task 5. Task 6 needs a paid Odds API plan and props are per-event
  fetches, so watch the credit burn against `CacheClient`. Task 10 needs a notification channel
  built from scratch.
- **Still no tests, now twice deferred.** Four production faults surfaced in one evening, none of
  which a type-check could have caught. Quota accounting and the billing webhooks are where a
  silent bug costs money rather than a parlay.
- `docs/TIERING.md` §7's numbers predate all of this: the 13% failure baseline was measured while
  odds were silently unavailable, so it describes a degraded agent, not the current one.
- The `odds: 0` guard is partial. `AILegSchema` bounds the range, but the format cannot express
  "not zero" — a union of the two valid American ranges is rejected by `zodTextFormat` — so
  `validate` remains the backstop.
- History depth is a view restriction, not a boundary: `firestore.rules` lets a user read all their
  own parlays, so the `limit()` is honest UI, not enforcement.
- No mobile release pipeline: builds are manual `eas build` invocations, and CI only lints and
  type-checks `mobile/`.
