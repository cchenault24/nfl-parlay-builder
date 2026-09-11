# Build tab restructure (iOS client)

## Goal
Split `mobile/`'s single long-scrolling Build tab into a board of games plus pushed
game-detail and parlay-detail screens, per `design/ui-redesign/DESIGN.md`.

**Run `multi-game-contract.md` first.** Tasks 6, 7 and 9 consume shapes it introduces.

## Ground rules
- Branch `claude/ios-ui-structure-redesign-67901c`. One commit per task, conventional commits.
- **Never `git stash`** — the tree is shared with other sessions. Stage explicit paths.
- No auto-retry. Stop at the first failing verify, leave the tree on the last green commit,
  and say which task blocked and why.
- No deploys, no `eas build`, no App Store Connect.
- Palette, type ramp, spacing and radii come from `designTokens.ts` unchanged. Tab label
  stays **Build**.

## Tasks

- [ ] **1. Test harness.** Add `vitest` + `npm test` to `mobile/package.json`, configured with
  the `@/` and `@shared/` aliases from `tsconfig.json`.
  → Verify: `cd mobile && npm test` passes.

- [ ] **2. Store keyed by game.** In `shared/store/parlayStore.ts` replace the single `parlay`
  with `parlays: Record<string, GeneratedParlay>` keyed `` `${week}:${gameId}` ``. Persist to
  AsyncStorage, hydrate on boot, prune earlier weeks on hydrate.
  → Verify: `npm test` — set/get round-trip, week-rollover pruning, and writing game B leaves
  game A intact.

- [ ] **3. Stop discarding parlays.** Remove the `reset()` in `handleGameChange`
  ([`mobile/src/app/(tabs)/index.tsx:36`](mobile/src/app/(tabs)/index.tsx)).
  → Verify: `npm test` — switching selection keeps both entries.

- [ ] **4. Routes.** Add `(tabs)/build/_layout.tsx` (Stack), move the tab screen to
  `build/index.tsx`, add `build/game/[gameId].tsx` and `build/parlay/[gameId].tsx`.
  `typedRoutes` is on, so bad hrefs fail the typecheck.
  → Verify: `npm run type-check` clean; every `router.push` target resolves.

- [ ] **5. Build list.** Extract the game list out of `GameSelector` into `build/index.tsx`,
  one row per game with the five states from DESIGN.md §4.2 (default / ready / running /
  failed / closed). Ready → parlay route, unbuilt → game route. Week becomes a header control.
  → Verify: `npm run type-check && npm run lint` clean; no `GameSelector` import remains.

- [ ] **6. GameDetailScreen.** `GameStatsPanel`'s body, accordion removed. Book-lines panel
  reads `GET /odds/week/:week`. Pinned action area: settings summary row, CTA, cost line.
  → Verify: `npm run type-check && npm run lint`; `npm test` — the panel renders nothing, not
  a placeholder, when the week has no odds.

- [ ] **7. RunSettingsSheet.** Risk, leg count and the four named sportsbooks move out of
  `GameSelector` into a modal sheet. Free pins DraftKings and **sends no `bookmaker`** —
  `agent.ts` 403s a requested book when `chooseSportsbook` is false. Pro resolves each book's
  `posted` flag from the odds read and disables the rest with "Not available".
  → Verify: `npm test` — free path sends no `bookmaker`; an unposted book renders disabled.

- [ ] **8. ParlayDetailScreen.** Building state hosts `AgentProgress` (now rendering
  `step.progress` as "4 of 6" when present); ready state is odds header, collapsed analysis
  over the per-game `AIAnalysis.games[]`, legs, pinned Save. Keep the nflverse CC BY 4.0
  attribution and model line — the licence requires it wherever the data surfaces.
  → Verify: `npm run type-check && npm run lint`; grep finds `nflverse` and `CC BY 4.0`.

- [ ] **9. Select mode and batch.** Header `Select` toggles multi-select; the batch bar
  replaces the tab bar. Two modes: **N parlays** (N single-game runs, created and streamed
  **sequentially** — CONTRACT §7) and **one cross-game** (one run, `gameIds`, Pro only,
  capped at `maxGamesPerRun`). Per-row queued / running / done / failed.
  → Verify: `npm test` — a three-game batch opens exactly one stream at a time and a mid-batch
  failure leaves the other two results intact.

- [ ] **10. Delete the corpse and gate.** `GameSelector.tsx` should be unreferenced; remove it
  and any newly-dead exports. Then
  `cd mobile && npm test && npm run type-check && npm run lint`, and `yarn lint && yarn type-check`
  at the root.
  → Verify: all green; `grep -r GameSelector mobile/src` returns nothing. Append to
  `HANDOFF.md`: what landed, and every screen still needing a simulator pass.

## Done When
- [ ] Ten tasks green, one commit each, branch pushed.
- [ ] `HANDOFF.md` names the screens a human has to look at.

## Notes
- **Nothing here proves the UI renders.** Tasks 1–3, 6, 7 and 9 have real tests; tasks 4, 5, 8
  and 10 are gated by the compiler and the linter only, and a screen can typecheck perfectly
  and render blank. Treat the morning output as reviewable work on a branch, not as done.
- Simulator pass: `cd mobile && LANG=en_US.UTF-8 npx expo run:ios --port 8082`.
- Re-capturing the five App Store screenshots is downstream of that pass, not of this plan.
