# Handoff — multi-game contract + Build tab restructure

Branch `claude/ios-ui-structure-redesign-67901c`. Written as the work landed; the
backend section is complete, the client section is appended as it goes.

---

## Before this can work in production

**`timeoutSeconds: 300` needs a deploy.** [`functions/src/index.ts`](functions/src/index.ts)
raised the `api` function's timeout from 120s. Nothing about it takes effect until
functions are deployed. A six-game run is budgeted at 190s and will be killed at
120s — after the model tokens have been spent — on the currently deployed
function. Deploy before raising anything, or before anyone tries a cross-game
parlay against production.

**`firestore.rules` must deploy with the web client.** The parlay-create rule
now requires a non-empty `gameIds`, and the currently-live web bundle writes
`gameId`. `firebase deploy` ships hosting and rules together, which closes the
gap to an already-open browser tab — a refresh fixes that. Do not deploy rules
on their own. The iOS app is unaffected: it has never shipped.

Everything else on the backend is code-only.

---

## Backend — what landed

| | |
|---|---|
| `POST /agent/runs` | takes `gameIds: string[]` (1–6). `gameId` is gone, not deprecated. |
| Refusals | `cross_game_locked` (403), `too_many_games` (403), `validation_error` (400) for duplicates, unknown ids, or games from two weeks |
| `TierCapabilities` | gains `maxGamesPerRun` — free 1, Pro 6 |
| `validateDraft` | takes `games[]`; one-leg-per-market is scoped per game |
| `AIAnalysis` | `{ games: GameAnalysis[]; slateSummary }`; a single-game run is an array of one |
| `AgentResult` | `game`/`homeStats`/`awayStats`/`odds`/`sources` moved into `games[]` |
| Orchestrator | per-game tool phases run concurrently inside the same eight steps |
| `AgentStep` | gains `progress: { done, total }`, set only across more than one game |
| `maxRunMs` | `90_000 + 20_000 × (games − 1)`; one game is still exactly 90s |
| Billing | bills when succeeded **and every game** got real odds |
| `GET /odds/week/:week` | per-book lines and `posted` for a whole week, on `publicRouter` |
| Odds slate cache | Firestore-backed instead of per-instance |
| Grading | each leg graded against its own game; a cross-game parlay waits for all of them |
| Closing lines | captured per game as each one kicks off, merged into the parlay across sweeps |
| `parlays/{id}` | writes `gameIds`; `gameId` is gone from the domain type and from the rule |

`npm test` in `functions/` covers the validator (characterized before it changed),
every run-input refusal, the orchestrator's fan-out and per-game pricing, the
billing rule, the odds slate and cache, and grading.

---

## Things found on the way that were not in the plan

**The leg count was a lie for every Pro user who changed it.**
`AIGenerateResponseSchema.legs` was pinned to exactly three whatever the caller
asked for, so a Pro user choosing 2 or 4–6 got a schema demanding three and a
draft the validator then rejected for the wrong leg count. The response schema is
built from `legCount` now. Worth checking production logs for `validation_error`
runs with "wrong number of legs" — they were all this.

**`max_output_tokens` was fixed at 4000.** Six games' analysis does not fit; it
would have truncated into `ai_incomplete` after spending the tokens. It scales
with the slate now.

**Step records were aliased.** The same mutable object was handed to both the
live stream and Firestore, so a consumer keeping what it was sent saw it change
underneath. Production never noticed because the Firestore writer JSON-clones on
the way in. Every handoff is a snapshot now.

---

## Known gaps, deliberately left

**Cross-game correlation is unproven.** Scoping one-leg-per-market per game
permits legs across games that nothing checks for correlation — two road
favourites in the same weather system, say. The prompt asks the model to avoid
it and to say so if it stacks anyway; there is no rule enforcing it.

## Resolved since the first pass

**Closing lines now cover cross-game parlays.** The sweep is driven by the
*games* about to kick off rather than by the parlays, so each leg is priced when
its own game closes and the parlay is written once per game it covers. A leg
already priced is never recomputed — its market is gone, and re-reading it later
would replace a real close with a meaningless one. `capturedGameIds` makes a
repeated sweep idempotent and `complete` says when nothing more will change.
`bookmaker` moved onto the leg, because a cross-game parlay's games can close at
different books. `not_yet_closed` is the new, and only temporary,
`ClvUnavailable` value.

**`gameId` is gone.** It survived one commit alongside `gameIds` only because
`firestore.rules` required it. The iOS app has never shipped, so the only client
that constraint protected was the web bundle — see the deploy note above.
Documents already saved still carry `gameId` and always will;
`normalizeStoredParlay` and `parlayGameIds` promote it to a one-element list on
read. That is normalization at the persistence boundary, and it is the reason
History renders at all for anything saved before this week.

---

# Client — Build tab restructure

## What a human has to look at

**Nothing here proves a screen renders.** Every logic module has real tests; the
screens themselves are gated by the compiler and the linter only, and a screen
can typecheck perfectly and render blank. Treat this as reviewable work on a
branch, not as done.

```bash
cd mobile && LANG=en_US.UTF-8 npx expo run:ios --port 8082
```

Screens that have never been rendered:

| Screen | What to check |
|---|---|
| Build list | Row states: default, running (step label, elapsed, cancel, rule), ready (odds chip, green border), failed (amber border, tap to retry), closed (dimmed, not tappable) |
| Build list header | Large `Week N ▾`, `Select`, the games/parlays line, quota strip on free |
| Week picker sheet | Past weeks dimmed and unpickable; `now` on the live week |
| Game detail | Hero, context rows, book lines, matchup rankings + `All rankings` disclosure, pinned settings row + CTA + cost line |
| Run settings sheet | Free: moderate only, 3 legs, DraftKings pinned with the others locked, fallback caption. Pro: all open, a book that has not posted the game disabled with "Not available" |
| Parlay detail — building | Eight rows, `4 of 6` on a multi-game run, elapsed, cancel |
| Parlay detail — ready | Odds at 30pt, confidence bar, analysis collapsed, legs, pinned Save, unbilled notice when prices were estimates |
| Select mode | Radios, batch bar replacing the tab bar, mode switch, cost line, cross-game locked on free |
| Cross-game row | Above the list, after a cross-game parlay is built and after a relaunch |

Two things worth checking specifically because they are device-dependent:

- **Liquid Glass.** `GlassSurface` resolves `isLiquidGlassAvailable()` once at
  import, inside a try/catch. It needs looking at on iOS 26 *and* on something
  older, where the flat `surface` fallback should be indistinguishable from the
  rest of the app.
- **Typed routes are not actually checking anything yet.** `.expo/types` has
  never been generated in this worktree, so `router.push('/build/game/…')`
  currently typechecks as a plain string. Run the dev server once and re-run
  `npm run type-check --prefix mobile` to get the real check.

App Store screenshots have to be re-captured after that pass — five of them,
and they are downstream of this, not of the plan.

## What landed

Build list → game detail → parlay detail, on a stack under the Build tab.
`GameSelector` is gone; `WeekSelector` went with it. The parlay store is one
entry per run keyed by week and games, persisted to AsyncStorage for the
current week only.

Logic that mattered is in `mobile/src/lib/build/`, tested: row states, run
settings (including "free sends no `bookmaker`"), the sequential batch runner,
step labels, and the quota copy.

## Gaps and decisions worth a second opinion

**The daily run valve is not surfaced before a batch.** DESIGN #22 wants a Pro
user with four runs left to be told *before* selecting six games. The batch bar
states what the tap costs in runs and names the cheaper mode, which is the part
that makes the choice legible — but it cannot say "4 of your 7 remaining today",
because `PRO_RUNS_PER_DAY` is deliberately not served by `/entitlements`
(`capabilities.ts` calls it a valve that should never be felt). Surfacing it
means reversing that decision and reshaping the persisted rate-limit store, so
it was left alone. A batch that trips the limit mid-flight stops rather than
firing the rest at it, and says how many games it did not start and when to try
again.

**Where a cross-game parlay lives is an addition to the design.** DESIGN §4.2
gives every row a game; a parlay spanning several belongs to none of them. It
is rendered as a row above the list, so it survives a relaunch instead of being
navigable exactly once.

**Free-tier select mode.** At 2 generations a week a free user may only ever
meet select mode as an upsell. DESIGN open risk #8 already flags this; it is
visible-but-blocked today, and worth watching.

**Batch + SSE concurrency is still untested against a real server.** Runs are
sequential by construction, so the load pattern is one stream at a time — but
nothing has yet run three real runs back to back against the deployed function.
