# ParlAId iOS — Build tab restructure

**Status:** design accepted, not implemented
**Date:** 2026-09-10
**Canvas:** https://claude.ai/code/artifact/313226e1-995a-4666-ad46-c4890dc99594
**Scope:** `mobile/` only. `shared/` is consumed, not restructured. The web client is untouched.

---

## 1. Understanding

### What is being built

A structural redesign of the ParlAId iOS app's navigation and screen layout. The
`Build` tab is currently one `ScrollView` that stacks the entire input surface and
then the entire output surface:

```
heading → week selector → ~14–16 game cards → risk → sportsbook →
quota → error banners → generate CTA → Game data (collapsible) →
AI analysis card → parlay card (3–5 leg cards + save + footer)
```

With a parlay on screen that is roughly 3–4 viewport heights. It becomes a
board-of-games information architecture with two pushed detail screens.

### Why it exists

Two structural faults, both consequences of one screen doing two jobs:

1. **The CTA sits below a ~1,200pt list.** After picking a game near the top of
   the week's games you scroll past everything to reach the button that acts on it.
2. **The result lands below the input that produced it.** Generating pushes the
   parlay below the entire game list, the settings and the quota strip.

And one data fault that the shopping job exposes: `handleGameChange` calls
`reset()` ([index.tsx:36](../../mobile/src/app/(tabs)/index.tsx)), so switching
games destroys the previous parlay. On free tier that generation is spent and
unrecoverable.

### Who it is for

Primary path is a **Pro** user shopping a week's games across several matchups.

Free tier is `generationsPerWeek: 2`
([capabilities.ts:31](../../functions/src/tiering/capabilities.ts)), so shopping
the week is structurally a Pro behavior. For a free user the Build tab's job is
**deciding well before spending** — matchup rankings, book lines, venue and
forecast cost no quota, and the game-detail screen exists to make that decision
cheap. One IA serves both; the quota is stated honestly inside it rather than
being discovered at the moment of refusal.

### Key constraints

| Constraint | Source |
|---|---|
| Dark-only, portrait-only, iPhone-only | `app.json` — `userInterfaceStyle: dark`, `supportsTablet: false` |
| Palette, type ramp, spacing, radii unchanged | `mobile/src/lib/theme/designTokens.ts` |
| Free: 2 generations/week, `moderate` risk only, 3 legs fixed, no sportsbook choice | `functions/src/tiering/capabilities.ts` |
| Pro: `PRO_RUNS_PER_HOUR = 20` **and `PRO_RUNS_PER_DAY = 10`**, both enforced as rate limits on run creation | `functions/src/tiering/capabilities.ts`, `routes/agent.ts` |
| `POST /agent/runs` takes a single `gameId` | `functions/src/routes/agent.ts:90` |
| Existing accessibility bar holds | roles/states on every control, 44pt targets, `primaryBright` for green text, `fontFamily`-based weights |
| No auto-retry on failures | user's standing rule |
| Lands before App Store submission | `finish-the-app.md` task 4 — the five captured screenshots get re-shot |

### Explicit non-goals

- No change to the web client.
- No restructuring of `shared/` (hooks, types, odds, tiering).
- No new dependencies beyond what `mobile/package.json` already carries.
- No visual refresh: this is IA and layout. Colors, type and spacing are fixed.
- No light mode, no iPad, no landscape.

---

## 2. Assumptions

1. Accessibility is non-negotiable and non-regressing: `accessibilityRole` /
   `accessibilityState` on every control, 44pt minimum targets, the documented
   contrast reasoning (`primaryBright` for green *text*, never `primary`),
   `fontFamily`-based weights only, and no breakage at large Dynamic Type sizes.
2. Glass is applied behind `isLiquidGlassAvailable()` with the current flat
   surfaces as the fallback. No deployment-target bump; the app must look correct
   on pre-iOS-26.
3. Batch size is bounded by what already exists, not by a new primitive. Free is
   held by its 2/week quota; Pro by `PRO_RUNS_PER_HOUR = 20`, `PRO_RUNS_PER_DAY = 10`
   and `maxGamesPerRun` (CONTRACT §1). Task 8's per-batch budget is not needed —
   see decision #22 and CONTRACT §7.
4. A partially failed batch is a normal outcome, not an error state. Successful
   runs stand, failures report per-row, and there is no auto-retry.
5. Lists stay `ScrollView`-based. A 16-row week does not justify a virtualized
   list; revisit only if a real screen exceeds what that handles.
6. Quota is decremented server-side per run. A batch of 3 costs 3. The UI's job is
   to make that legible *before* the tap, never to invent client-side accounting.
7. ~~A failed run does not spend quota.~~ **Verified, and stronger than assumed.**
   `finishRun` bills only when `status === 'succeeded' && result.sources.odds === 'ok'`
   ([firestore.ts:88](../../functions/src/agent/store/firestore.ts)). Failures,
   cancellations, *and* successful runs that fell back to AI-estimated prices are
   all free to the user. See decision #17.

---

## 3. Decision log

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| 1 | Board-of-games IA, detail screens pushed on the Build stack | Inline row expansion; week board with a persistent parlay drawer | One job per screen; natural back stack; deep-linkable. Inline expansion reintroduces the accordion pattern that made the current screen long. The drawer competes with the tab bar. |
| 2 | Tabs stay **Build** / History / Account | Rename Build → Slate; rework to Slate / Parlays / Account | Reversed on 2026-09-10 after the canvas review: "Slate" is industry jargon most users will not parse, and comprehension beats the fact that "Build" names an action while the screen becomes a place. Collapsing generated and saved into one "Parlays" tab erases a distinction that still matters (see #6). |
| 3 | Game detail is its own screen, reachable *before* generating | Keep the collapsed `GameStatsPanel` attached to the parlay result | Data that only appears after you have spent a generation cannot help you decide which game to spend it on. This is the single highest-value move for free users. |
| 4 | Parlay detail is its own pushed screen | Full-screen sheet; inline with a collapsed picker | The result earns the full viewport, and one screen is then reusable by saved parlays and shared links. A sheet is a dead end for deep links. |
| 5 | Generated parlays persist per `week + gameId` in AsyncStorage, current week only | Auto-persist every run to Firestore; in-memory for the session | Shopping becomes non-destructive and a spent quota unit is never lost to a relaunch. Firestore auto-save would erase the meaning of `Save` and add write cost; session-only loses a parlay worth half a free week. |
| 6 | `Save` keeps its meaning — permanent in History | Auto-save everything; drop Save entirely | Follows from #5. History stays the durable, graded record; the Build tab holds this week's working set. |
| 7 | Risk / legs / sportsbook collapse to one summary row opening a sheet | Keep inline; move to a settings tab | They are per-run settings, so they belong beside the action they modify — not between the user and the game list. On free they are fully locked and were sitting mid-flow as dead controls. |
| 8 | Locked controls stay visible and legible in the sheet | Hide them from free users | Matches the existing `Segmented.tsx` reasoning: "the conversion moment is a control the user already wants, not an empty state." |
| 9 | Single-game generation pushes parlay detail in a *building* state carrying the step timeline | Keep `AgentProgress` on the Build list; a dedicated progress screen | You are committed to that one game, so you want to watch. `AgentProgress` relocates rather than dies. |
| 10 | Batch runs report per-row on the Build list | One batch progress screen; strictly sequential full-screen progress | You want to keep browsing while 3 runs proceed. A blocking screen reads as a long wait; sequential full-screen progress is 3× 20–60s of serialized staring. |
| 11 | Batch action bar *replaces* the tab bar in select mode | Stack it above the tab bar | Two stacked bottom bars eat ~150pt and read as clutter. Select mode is modal by nature; Done exits it. |
| 12 | Mode switch inside the batch bar separates "N parlays" from "one cross-game parlay" | One gesture serving both; two entry points | They are genuinely different products with different backend requirements. One multi-select gesture with an explicit mode switch keeps the selection work shared and the outcome unambiguous. |
| 13 | Week becomes a header control, not a chip strip | Keep the horizontal `WeekSelector` strip | Past weeks are locked (`disabled: week < liveWeek`), so the strip spends vertical space on mostly-unusable options. |
| 14 | AI analysis is collapsed by default on parlay detail | Expanded above the legs, as today | The legs are the product; the essay is evidence. Expanded, it pushes the legs below the fold on the screen whose whole purpose is showing them. |
| 15 | Ready rows tap to the parlay; unbuilt rows tap to game detail | Always to game detail | Maps to what the user wants at that moment. Game detail stays reachable from the parlay screen. |
| 16 | Glass on tab bar, pinned action bars and sheets only | No glass; glass as a broad direction | Native chrome is where iOS does glass best and where a flat fallback is least noticeable. A broader treatment would contradict "keep the theme the same." |
| 17 | Surface *when a run was free* on the parlay screen | Say nothing; only mention quota before the tap | Billing is conditional on anchored odds, so a user can receive a parlay and correctly still have their full allowance. Silence there reads as a bug or a lie. It also reframes the existing "Estimate" label from purely bad news into a partial refund. |
| 18 | No catch-all sportsbook option — the book is always named | "Best available"; "Best odds" backed by a real price comparison | An abstraction nobody could parse, and the version that would have made it honest ("best odds") required price-shopping the app does not do. Naming a concrete book is truthful with zero backend change, since `getOdds` already walks DraftKings → FanDuel → BetMGM → Caesars and discloses a fallback. |
| 19 | Free is pinned to DraftKings, other books locked; Pro picks | Let free choose; hide the control on free | The control stays legible and states what free actually gets, rather than presenting a choice that is not one. Consistent with #8. |
| 20 | Fallback disclosure is **free-only**; Pro sees availability up front | Show the fallback caption to both tiers | A free user never chose a book, so naming the swap after the fact is the whole disclosure. A Pro user made a deliberate choice, and silently swapping it — then explaining afterwards — is the worse experience. Pro is told before the run instead. |
| 22 | Select mode states the daily run cost before the tap, and names the cheaper mode | Show nothing; rely on the failure | `PRO_RUNS_PER_DAY = 10` landed on main 2026-09-11. Batch spends one run per game against it, so a six-game batch is 60% of a day. Discovering that when run 5 is refused is the worst version. Naming cross-game's 1-run cost in the same line makes the cheaper path obvious at the moment of choice. |
| 21 | A book that has not posted this game is **disabled and labelled "Not available"** | Hide unavailable books; leave them enabled and fail at run time | Hiding them makes the list change shape game to game with no explanation. Leaving them enabled sells a choice that cannot be honoured. Disabled-with-a-reason is the only option that is both stable and truthful. Pro's selection falls to the next available book in priority order when the current pick goes unavailable. |

---

## 4. The design

### 4.1 Navigation

```
Tabs
├── Build              (stack)
│   ├── BuildScreen            — week's games, each carrying its parlay state
│   ├── GameDetailScreen       — matchup, lines, context; Generate pinned
│   └── ParlayDetailScreen     — building → ready; also saved + shared parlays
├── History            — saved parlays, graded
└── Account            — unchanged
```

Presented modally over the Build stack:

- `RunSettingsSheet` — risk, legs, sportsbook, upsell
- `UpgradeSheet` — unchanged, existing component

### 4.2 Build screen

Header (non-scrolling): large `Week N ▾` title opening a week picker, a
`Select` action for batch mode, a one-line `14 games · 2 parlays built` summary,
and the quota strip (`QuotaIndicator`, relocated — free only, Pro sees nothing).

Body: one row per game. The row is the whole redesign in miniature — it carries
the game *and* its parlay state, which is what makes the week shoppable:

| State | Treatment |
|---|---|
| Default | `surface` fill, hairline border, chevron |
| Ready | `surfaceRaised` fill, `primaryBright` border, odds chip, "3-leg parlay ready" |
| Running | Step label + elapsed + `Cancel` + 3pt progress rule |
| Failed | `warning` border chip `Retry`, "Run failed — quota not spent" |
| Closed | `opacity: 0.45`, not tappable (unchanged from today) |

### 4.3 Game detail screen

Nav bar with back. Scrolling body: matchup hero (logos, records), context rows
(kickoff ET, venue, forecast), book lines panel, matchup rankings with a
disclosure to the full set and team stat cards.

Pinned action area (the fix for fault 1):

1. Run-settings summary row — `Moderate · 3 legs · DraftKings`, with a `PRO`
   chip when any of it is gated. Opens the sheet.
2. Primary `Create N-leg parlay` button.
3. Cost line — `Counts as 1 of your 2 parlays if it gets live book prices`
   (free only). The hedge is not caution, it is the billing rule: a run that
   falls back to estimated prices is never billed.

### 4.4 Parlay detail screen

**Building state:** title, elapsed, and the eight `AgentProgress` rows, with
`Cancel`. Same component, new home.

**Ready state:** combined odds at 30pt as the top-right anchor, overall confidence
bar, AI analysis collapsed, then the leg cards, then the pinned `Save to History`
action and the entertainment-only disclaimer. The header names the winning book
and the size of the field it beat, so "Best odds" is shown rather than claimed.

When the run was not billed — any leg unanchored, so `sources.odds !== 'ok'` —
the screen says so beside the existing `Estimate` disclosure: *"Prices are AI
estimates, so this one didn't count against your 2 this week."* Free tier only;
Pro has no counter to credit. The nflverse CC BY 4.0 attribution
and model line stay in the footer — the licence condition applies wherever the
data surfaces.

### 4.5 Select mode

Rows gain a leading radio. Already-built games are excluded and marked, because
re-running them costs quota for something already owned. The bottom bar replaces
the tab bar and carries the mode switch (`3 parlays` / `One cross-game`), the
primary action, and a line stating what the run will cost.

That cost line is not decoration. `PRO_RUNS_PER_DAY = 10` is a rate limit on run
creation, and batch spends one run per game — a six-game batch is 60% of a Pro
user's day, against 10% for the same six games as one cross-game parlay. The bar
states both before the tap, because the alternative is runs 5 and 6 failing with a
countdown halfway through. Free's equivalent is the weekly quota it already shows.

### 4.6 Run settings sheet

Risk segmented (locked segments legible, `secondary` lock glyph), leg-count chips,
and the four named sportsbooks. Two variants:

- **Free** — Moderate only, 3 legs, DraftKings pinned, the other books carrying the
  Pro lock, and the fallback caption. One upsell at the bottom, after the controls it
  explains rather than before them.
- **Pro** — every control open, and each book's availability resolved for *this game*.
  A book that has not posted it is disabled and labelled "Not available"; no fallback
  caption, because a deliberate choice is never swapped silently. If the current pick
  goes unavailable, selection falls to the next available book in priority order.

---

## 5. Implementation notes

### Backend (in scope, same push)

- `POST /agent/runs` accepts `gameIds: string[]` alongside `gameId`.
- Orchestrator fans out on one odds fetch per slate (task 9).
- `validate.ts`'s one-leg-per-market rule scopes per game.
- Per-batch run budget in `TierCapabilities`, enforced beside the weekly quota
  (task 8).

Client-side batch fan-out over today's single-`gameId` endpoint is the fallback
if the backend slips; cross-game mode is hidden entirely until the API supports
it. **No dead UI ships to the App Store.**

### Sportsbook

Selection and fallback need no backend change; **availability does**.

`getOdds` already does what the fallback describes:

- The free client **must not send `bookmaker`**. `agent.ts` rejects a requested book
  with `403 sportsbook_locked` when `capabilities.chooseSportsbook` is false, so
  sending `draftkings` to match the label would break every free run. It sends
  nothing and the server's priority order already starts at DraftKings — the UI
  shows the name, the server picks it.
- Pro sends an explicit `bookmaker`; the existing `fellBack` disclosure covers a
  game that book has not posted.
- `bookLinesLabel` in `GameStatsPanel.tsx` already names the real source and says so
  when it differs from the request. It moves to game detail and parlay detail intact,
  but its copy is now free-tier only (#20).

**The gap: there is no pre-run odds endpoint.** `publicRouter` exposes `/season` and
`/games` and nothing else, so the client cannot know which books posted a game until
a run has already completed. Two things in this design need that:

1. Disabling unavailable books with "Not available" (#21).
2. The book-lines panel on game detail, which shows spread/total/moneyline *before*
   generating.

Both are served by one addition — a per-game odds read returning the per-book
snapshot. The Odds API response already contains all four books in a single request
([client.ts:40](../../functions/src/providers/odds/client.ts)), so this is one call
per game, not four. It must be cached: game detail would otherwise spend an Odds API
credit every time someone opens a matchup, which is a far higher call rate than
run-triggered fetches.

### Client

- New `parlayStore` shape: `Record<string, GeneratedParlay>` keyed by
  `${week}:${gameId}`, persisted to AsyncStorage, cleared on week rollover.
- `handleGameChange` stops calling `reset()`.
- `GameStatsPanel` loses its accordion and becomes the body of `GameDetailScreen`.
- `AgentProgress` moves into `ParlayDetailScreen`'s building state plus a compact
  row variant for the Build list.
- `GameSelector` dissolves: game list → `BuildScreen`, risk/sportsbook →
  `RunSettingsSheet`, CTA → `GameDetailScreen`'s pinned area.

---

## 6. Open risks

1. ~~"Quota not spent" on a failed run is unverified.~~ **Resolved** — see
   assumption 7 and decision #17. Billing happens in `finishRun` and only for a
   succeeded run with anchored odds, so the copy is accurate and there is a second
   free case to surface.
2. **Cross-game validation is unproven.** Scoping one-leg-per-market per game may
   surface correlated legs across games that `validate.ts` has no rule for.
3. **App Store screenshots must be re-captured**, and the submission slips by
   however long this takes.
4. **A batch can trip the daily valve mid-flight.** Runs are created sequentially, so a
   batch that starts inside the limit can still be refused partway. Earlier results stand
   and the per-row failed state covers it, but the reset time needs surfacing on the row.
5. **Batch + SSE concurrency is untested.** Three simultaneous run streams against
   the existing timeline transport is a load pattern the app has never produced.
6. ~~"Best" needs a definition.~~ **Dropped** — decision #18 removed the catch-all
   rather than defining it, so no price-comparison rule is needed.
7. **Pre-run odds endpoint is unscoped and unbudgeted.** See the Sportsbook
   implementation note. The credit cost of game detail fetching odds on open is the
   open question — caching strategy and TTL need deciding before this ships.
8. **Free-tier reality check.** At 2 generations/week, a free user may never
   experience select mode as anything but an upsell. Worth watching whether it
   should be Pro-only rather than universally visible but immediately blocked.
