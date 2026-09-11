# ParlAId iOS — launch readiness review

Reviewed 2026-09-11 against `origin/main` at `c5c7c43`, bar: App Store review submission.
Scope: `mobile/src`, `shared/`, the Cloud Functions routes the app calls, native config, and a
live dev-client run on an iPhone 17 Pro simulator. Fixes landed on `review/ios-launch-readiness`.

## Verdict

**Not submittable today; submittable after three decisions that are yours, not code.**

The codebase is in unusually good shape for its age: one obeyed token file, tested pure-logic
modules, StoreKit 2 verified server-side, Keychain-backed sessions, account deletion, an age
gate, and honest billing copy. The review found two app-breaking bugs and a cluster of
quota-costing races, all now fixed. What still blocks submission is operational:

| # | Decision | Why it blocks | Cheapest path |
|---|---|---|---|
| 1 | **Turn Apple billing on, or hide Pro for 1.0** | The deployed function has no Apple secrets bound, so `billingAvailable.apple` is false and the paywall renders "Not on sale yet." with no buy button. A reviewer reads that as unfinished (2.1); an attached IAP they cannot buy is rejected. Docs say the purchase flow has never run against a store. | Either finish `docs/BILLING_SETUP.md` §3–6 and run one sandbox purchase + restore on a device, or do not attach the IAP and hide the three Pro entry points while `billingAvailable.apple` is false. |
| 2 | **Confirm `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is unset in the EAS production environment** | Google sign-in with no Sign in with Apple is a 4.8 rejection. The button is already gated on that variable; nothing implements Apple sign-in. | Leave it unset for 1.0 (email/password only is compliant). Add `expo-apple-authentication` before ever enabling Google. Fix `docs/TIERING.md:43`, which advertises Google. |
| 3 | **Verify the seven `EXPO_PUBLIC_*` variables exist in EAS for `production`, and point the API one at the function's direct URL** | `firebase.ts` and `api/config.ts` throw at module scope without them; `.env.local` is gitignored and never uploaded. Could not check locally (no `eas` CLI installed). And the Hosting rewrite (`…web.app/api`) buffers the run's step stream, so the live timeline is blank until the run ends. | `eas env:list --environment production` from `mobile/`; set `EXPO_PUBLIC_API_BASE_URL=https://api-2fz6nf6s4a-uc.a.run.app`; smoke-test with the `simulator` profile, which already uses the production environment. |

**Status after the follow-up session (same day):**

1. **Billing — in progress.** Christian chose to enable Apple billing for 1.0. `APPLE_BUNDLE_ID`
   and `APPLE_ROOT_CA_G3` exist in Secret Manager (the CA's SHA-256 fingerprint was checked against
   Apple's published value) and all three Apple secrets are bound in `functions/src/index.ts`.
   `APPLE_APP_APPLE_ID` was created later the same day with the real value, so the branch is safe
   to merge and the merge deploys billing. In App Store Connect the subscription now exists:
   group "ParlAId Pro" (id 22377769), product `com.debugdad.parlaid.pro.monthly` (Apple ID
   6811151393), 1 month, $9.99 USD with Apple's auto-converted prices in all 175 regions, available
   everywhere, English (U.S.) localization "Pro" on both the product and the group. Status stays
   "Prepare for Submission" until the **review screenshot** is uploaded on the product page —
   capture the paywall on a device once billing is live, since that is the only place StoreKit
   returns the price. Still his: the Server Notifications V2 URLs, a Sandbox Tester, the
   screenshot, and one sandbox purchase + restore on a device. The first subscription is submitted
   together with the 1.0 version ("Add for Review").
2. **Sign in with Apple — done in code.** Christian chose to add it. `expo-apple-authentication`,
   the entitlement, Apple's own button above Google on the sheet, a hashed nonce checked by
   Firebase, and the first-sign-in name kept. The Apple provider is enabled on the Firebase
   project (via the Identity Toolkit API). The Google client id stays unset in EAS, so Google does
   not ship. EAS syncs the Sign in with Apple capability onto the App ID at the next `eas build`.
3. **Environment — done.** All seven `EXPO_PUBLIC_*` variables exist in EAS `production` and
   `preview`; `EXPO_PUBLIC_API_BASE_URL` in both now points at the function's direct URL. The next
   production build gets a live timeline.

Everything else that was actionable is fixed in this branch. The follow-ups below are
architecture, not fixes.

## Fixed in this branch

Commit `5591ac4`, 56 files. Every item was confirmed against library source or a traced call
path before it was changed. All suites green after the change: mobile 154 tests, shared 219,
functions 216, type-check clean in all three, lint clean.

### Blockers

- **Every sign-in failed.** The Keychain persistence that landed on 2026-09-11 wrote Firebase's
  storage key `firebase:authUser:<apiKey>:[DEFAULT]` straight into expo-secure-store, whose key
  validator is `/^[\w.-]+$/`. The write rejected, and Firebase awaits that write inside
  `signInWithEmailAndPassword`. Keys are now mapped deterministically onto SecureStore's alphabet
  (`secureChunks.ts`), with a test that runs the real Firebase key through SecureStore's own regex.
  Verified statically against both libraries' source; a device sign-in needs your credentials.
- **Double-billed run.** A running row fell through to the game screen, whose Create button could
  not see the run in flight; tapping it reset the timeline, orphaned the first run's abort
  controller and reserved a second quota slot. `useParlayGenerator` now refuses a second start on
  a running key, the list row opens the timeline, and the game screen shows "View progress".

### High

- **Cancel before the stream opened was ignored.** The Cancel button renders while `POST /runs`
  is still in flight; an abort in that window had no listener, so the run executed, billed, and its
  result was dropped. `awaitResult` now checks `signal.aborted` before opening the stream and
  cancels server-side. Test added.
- **Navigator remounted on every sign-in** because `loading` included the profile fetch: the tabs
  painted, went blank for two Firestore reads, then painted again. The root navigator gates on the
  first auth state only.
- **Screen could lock mid-run.** `expo-keep-awake` was installed and unused. A `KeepAwake`
  component now mounts only while a run or batch is on screen.
- **Stale token on reconcile.** The token minted at run start was reused up to three minutes later
  for the dropped-stream `getRun`, turning a billed success into "Authentication failed". A fresh
  token is read for reconcile and cancel. Test added.
- **No client deadline on the stream.** A hung socket left the entry "running" until relaunch. A
  300 s deadline (the function's own timeout) now reconciles through `getRun`. Test added.
- **No retry anywhere** despite "Try again" in the copy and `retry: false` on the query client.
  Build list, game screen, and History each got a "Try again" button; the Build list also surfaces
  a failed entitlements load instead of silently locking every control.
- **Raw errors reached users**: `Request failed (503)` and lowercase Firebase fragments
  (`invalid credential`). Auth codes map to sentences; the schedule fetch has a human fallback.
- **No password reset existed.** A locked-out user had no way back in. "Forgot password?" on the
  sign-in sheet sends Firebase's reset email.
- **Seven text links under 44 pt, three with no role.** One `LinkButton` primitive
  (`minHeight: MIN_TARGET`, hit slop, role, pressed state) replaces ten hand-rolled sites; the
  destructive "Delete account" button's `minHeight: 0` override is gone.

### Medium

- Sign-out never emptied the module-singleton parlay store: the reset lived in a hook that
  unmounted with the tabs. Account A's in-flight run could land, as ready, in account B's
  persisted board. Reset moved to the root navigator; running entries are cancelled; the
  rate-limit store is cleared too.
- A ready parlay became unreachable the moment its game kicked off (row disabled). Ready rows
  stay tappable after kickoff.
- "Save to History" could save the same parlay repeatedly (flag was screen-local). A session-level
  saved set backs the button.
- Google sign-in could spin forever: expo-auth-session's code exchange has no rejection path. A
  30 s timeout surfaces an error. (Untestable here: no Google client id configured.)
- Age gate "Continue" did nothing if the AsyncStorage write threw. State flips first, write second.
- Batch stopped only on `rate_limited`; `quota_exhausted` and `unauthorized` now stop it too, with
  copy that names which. Test added.
- Game screen showed "no longer in this week" for a network failure and eight "N/A" chips while
  stats loaded. It now distinguishes loading, error, and absent.
- Locked leg-count chips were dead targets while the other two locked controls opened the upgrade
  sheet. They open it now, and ChipStrip no longer tells VoiceOver a locked chip is disabled.
- Kickoff rendered in device time on the list and Eastern on the detail. One `formatKickoff` in
  `shared/`.
- Rows asserted "quota not spent" for a failure the client cannot judge; the detail screen
  deliberately refused to. Rows now say "tap to retry".
- Cross-game row could push a screen while the tab bar was hidden for select mode, leaving the
  pinned bar on the home indicator. Disabled in select mode.
- Red rank chips on striped rows measured 4.09:1. New `errorBright` token at 5.04:1 on
  `surfaceRaised`; pending-step glyph border raised from 1.48:1 to `border`.
- `ErrorBanner` announced nothing on iOS (`accessibilityLiveRegion` is Android-only) and read
  prose as "alert". Announces via `AccessibilityInfo` for error types only.
- Paywall could show no price and still sell. Upgrade is disabled with an inline message when
  StoreKit returns no price.
- Terms of Service had no subscription terms though the paywall links it as Terms of Use. A
  Subscriptions section was added; 1-800-GAMBLER joins the helpline list; the privacy policy no
  longer claims analytics or audits that do not exist.
- **Server:** sandbox App Store Server Notifications were rejected — the production verifier
  throws `INVALID_APP_IDENTIFIER` (sandbox payloads omit `appAppleId`) before the environment
  check, and only `INVALID_ENVIRONMENT` triggered the sandbox retry. Both now retry. Tests added.
- **Server:** partial account deletion said "Nothing has been removed" after data was gone.

### Low

Landing copy rewritten out of the betting voice ("Join thousands of bettors", "betting
portfolio", "enterprise-grade security"); launch storyboard status bar set to light; `@expo/ui`,
`expo-symbols`, `expo-device` removed (no imports; `expo-application` stays as a peer of
expo-auth-session); token drift (`fontSize: 10`, `gap: 2`, `minHeight: 48`) corrected; dead
styles, a stale comment, and an unused eslint-disable removed; progressbar and logo fallback
labels for VoiceOver; legal rows in sentence case.

## Open follow-ups (not fixed, by design)

1. **Hour/day rate-limit counters are never refunded** when a run ends unbilled
   (`middleware/rateLimit.ts` increments at POST; `refundUnlessBillable` touches only `quotas`). A
   Pro user on a flaky connection burns their 10/day valve on zero parlays. The fix touches the run
   transaction: `refundUnlessBillable` lives in `agent/store/firestore.ts` and runs inside a
   transaction that has already written, so the release must be its own transaction after
   `transitionRun`, keyed on `run.createdAt` against the counter's `windowStart`. ~30 lines across
   three files; the agent that scoped it declined to force it into the file set it owned.
2. **Execution rides the client socket** (`req.on('close', () => controller.abort())`). Every
   Wi-Fi/cellular handoff cancels the run. Documented and deliberate (Cloud Run CPU throttling),
   but on a phone it is routine, not edge. Options: `--no-cpu-throttling` on the service, or a
   worker triggered at creation with the stream route as pure mirror, then one client reconnect.
3. **Stripe and Apple overwrite each other's grant** (last writer wins on one entitlement record).
   An Apple `EXPIRED` demotes a user who since bought Pro on the web. Guard in `setEntitlement`:
   skip the demotion when the existing record is Pro from a different source.
4. **Dynamic Type and Reduce Motion** are unhandled anywhere (zero `maxFontSizeMultiplier`, zero
   `useReducedMotion`). Fixed-width rank columns (58 pt) truncate at AX sizes; every sheet slides
   and every `LayoutAnimation` runs regardless. Not a rejection risk, a quality one.
5. **Two bottom-sheet chromes** (`ui/Sheet` vs `UpgradeSheet`) have drifted: glass vs flat,
   grabber vs X, 24 vs 18 pt titles. The purchase surface is the odd one out. Render
   `UpgradeSheet` inside `Sheet` with a footer slot.
6. **Grabber with no drag; opaque tab bar under a glass pinned bar** on iOS 26. Either native
   `formSheet` presentation with detents, or drop the grabber; expo-router's `NativeTabs` gives the
   glass tab bar for free.
7. Sandbox grants are production Pro forever (nothing sweeps `appleEnvironment == 'Sandbox'`);
   Billing Grace Period is not honored (leave it off in App Store Connect); cross-account restore
   returns a generic 400 and retries every launch; `verifyIdToken` runs without `checkRevoked`;
   the stream route has no rate limit; `sharedParlays` is a point-in-time snapshot (web only).

## Signed-in walkthrough (after the fixes)

Christian signed in on the simulator, which confirmed the Keychain key fix on a device, and every
authenticated screen was walked: Build list, game detail, run settings, a live run, the parlay,
Save, History, Account. Two generations were spent. What it turned up, all fixed and pushed:

- **The live timeline was not live.** At 21 s into a run that finished around 40, no step had
  reported; the screen sat blank and then jumped to the result. The app called the API through
  the Hosting rewrite (`nfl-parlay-builder.web.app/api`), and the response headers show Fastly's
  cache in front of the function, which buffers the SSE stream until the response completes.
  Against the function's own URL (`https://api-2fz6nf6s4a-uc.a.run.app`) six steps were checked
  off by 13 s with "Draft the parlay" spinning. Christian had noticed the same. The web app uses
  the same rewrite, so its timeline is buffered too; CORS is already allowlisted, so it can take
  the same change. `.env.example` now says which URL to use and why.
- The new `LinkButton`'s 44 pt box pushed the parlay footer's lines apart. Inline links now take
  the line's height and a larger hit slop (WCAG's inline exception).
- Bet-type chips rendered the raw enum ("player passing yards"). One `betTypeLabel` replaces
  five hand-rolled `replace()` calls across both clients.
- Nothing named the sportsbook the run priced at. The book now travels on the parlay
  (`bookmaker`, from the run's odds snapshots), sits in the headline ("3-leg parlay ·
  DraftKings"), and shows on History cards; the share view carries it.
- The Account tab never said which plan the user was on. A plan card shows Pro with "Manage
  subscription", or Free with "Upgrade to Pro".
- History cards were inert: a saved parlay had no screen to open into. The History tab is now a
  stack and the whole card opens the parlay, rendered by a `ParlayView` shared with the build flow
  so the two cannot drift. "Pending" (the grading status verbatim) became "Upcoming" before
  kickoff, "Not graded" after it, and Won/Lost/Push/Partial once the sweep records an outcome.
  The book shows on cards that carry it; parlays saved before today have nothing to show. The
  saved screen has a confirmed "Delete from History" action; deleting also un-marks the run's Save
  button so the parlay can be saved again before kickoff.
- The six legacy September-2025 parlay documents (no week, no kickoff, all Christian's) were
  deleted from production Firestore at his request, after a JSON backup to the session
  scratchpad. One document remains, the parlay saved during this walkthrough.
- Seen, not changed: older saved parlays show "Pending" on games long finished (legacy documents
  the grading sweep cannot match); the dev-client gear overlaps "Select" on the Build header (dev
  builds only); the estimated-prices banner reuses the rate-limit banner's clock icon.

## Design review (measured)

Screens captured: age gate, landing, sign-in sheet. Authenticated screens need your credentials;
the code-level review covered them (see the "Screens × states" findings above).

**Measured:** background `#121212` at 87–92 % of every screen, accent `#2e7d32` at 5.4–5.5 %,
ink coverage 15 % (age gate), 35 % (landing), 16 % (sign-in). Type scale 30/24/18/16/15/13/12/11
with weight carried by Inter 400–700, spacing on a 2/4/8/16/24/32/48 ladder, radii 6/10/14/pill.
Every text-on-surface pair in the captures clears 4.5:1; the one failing pair was in code (rank
chips) and is fixed.

**Verdict: Solid.** The visual system is real and obeyed; the issues are copy, one competing
control, and empty space.

- **Age gate.** Clear hierarchy, the checkbox row is a proper 44 pt+ target with a checked state.
  "Legal compliance check for adult content" reads as internal; the helpline sits in
  `textDisabled` (5.4:1 but visually the quietest thing on a screen where it matters most). The
  red "I am under 18" text button competes with the primary for attention — a neutral link would
  serve the same function. The ncpgambling.org link on the declined screen is the only exit.
- **Landing.** The wordmark carries it. Squint test passes: wordmark, green primary, sample card.
  The sample parlay's middle leg is a player prop, a Pro-only market, shown to free sign-ups; and
  the four feature cards below are the monotony pattern (same card, same icon size, same weight).
  Two of the four could be one line each.
- **Sign-in.** A pageSheet with two fields and 60 % dead space. Fine, but the sheet could be a
  `formSheet` with a medium detent so the landing stays visible behind it. Keyboard "go" now
  submits; "Forgot password?" now exists.
- **Cross-cutting (from code):** three nouns for one unit (run / generation / parlay) across the
  batch bar, the rate-limit banner and the quota strip — settle on "parlay"; "Batch" is developer
  vocabulary; `errorBright` should be used wherever red text sits on `surfaceRaised`.

**Heuristics that flagged:** H1 (game screen loading state — fixed), H3 (no password reset, no
retry — fixed), H4 (two sheet chromes, kickoff time zones — one fixed), H9 (raw transport and
Firebase errors — fixed).

## App Store Connect checklist (owner)

- Age rating: real-money gambling No, simulated gambling None, answers yielding 17+/18+; in-app
  minimum is 18, not 21.
- Category: Sports, secondary Entertainment. Not Games.
- Privacy label, data linked to user: email, user ID, user content (saved parlays, history),
  purchase history if IAP ships. Not collected: location, contacts, diagnostics, tracking
  (`NSPrivacyTracking false`). Third parties seeing IPs only: ESPN CDN (logos), Google (auth,
  Firestore), OpenAI via your backend.
- URLs (all 200): privacy `https://nfl-parlay-builder.web.app/privacy`, terms `/terms`,
  support `/support`. Put the terms URL in the EULA field for the subscription.
- Review notes: entertainment only, no wagers placed or facilitated, no sportsbook links, 18+ gate
  on first launch and every 30 days; provide a demo email/password account (none is hard-coded);
  state whether Pro is on sale in this build.
- If IAP ships: auto-renewable, product id exactly `com.debugdad.parlaid.pro.monthly`, one group,
  Server Notifications V2 URL `https://nfl-parlay-builder.web.app/api/billing/webhooks/apple` for
  production and sandbox, a Sandbox Tester signed in under Settings → Developer.
- Screenshots: 6.9" (1320×2868) required; portrait only; no iPad set.
- Optional: `submit.production.ios.ascAppId` and `appleTeamId` in `eas.json` once the record
  exists. Delete the untracked `functions/sol-tmp.cjs` before merging anything.

## What was verified how

- Static: every finding cites file and line; library claims (SecureStore regex, Firebase key
  format, App Store Server Library verifier ordering, expo-iap `getAvailablePurchases` default,
  expo-auth-session exchange path) were read from `node_modules` source.
- Automated: type-check, vitest and eslint in `mobile`, root (`shared`), and `functions` before
  and after the change.
- Live: dev client built with `expo run:ios` on iPhone 17 Pro (iOS 26 simulator). Age gate
  persists across relaunch; landing and sign-in render with the new copy and the reset link.
  Local gotcha worth knowing: `expo run:ios` skipped `pod install` after the dependency change, so
  the first build lacked `ExpoSecureStore`; a manual `pod install` with a UTF-8 locale fixed it.
- Live, signed in: every authenticated screen, two real generations, one against the Hosting
  rewrite and one against the function's direct URL (see the walkthrough section).
- Not verified: EAS environment variables, App Store Connect state, a sandbox purchase.
