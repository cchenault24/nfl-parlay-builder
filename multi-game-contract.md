# Multi-game contract (backend)

## Goal
Implement `design/ui-redesign/CONTRACT.md` — `gameIds`, per-game validation and analysis,
parallel fan-out, and the pre-run odds read. **Run this plan before
`build-tab-restructure.md`**; the client depends on these shapes.

## Ground rules
- Branch `claude/ios-ui-structure-redesign-67901c`. One commit per task, conventional commits.
- **Never `git stash`** — the tree is shared with other sessions. Stage explicit paths.
- No auto-retry. Stop at the first failing verify, leave the tree on the last green commit,
  and say which task blocked and why.
- **Do not deploy.** Task 1 only takes effect on deploy; that is a human step.

## Tasks

- [ ] **1. Raise the platform timeout.** `timeoutSeconds: 120` → `300` in
  [`functions/src/index.ts:106`](functions/src/index.ts). Nothing else in this plan is
  reachable without it: the stream is held open for the whole run, and six games needs ~190s.
  → Verify: `cd functions && npm run build`; grep shows `timeoutSeconds: 300`.

- [ ] **2. Test harness for functions.** Add `vitest` + `npm test` to `functions/package.json`.
  Port the existing `validateDraft` behaviour into tests **before** changing it — one test per
  current rule (leg count, team membership, odds range, player-prop gating, anchored
  confidence, one-leg-per-market).
  → Verify: `cd functions && npm test` — all pass against today's unmodified validator.

- [ ] **3. `gameIds` on the run.** `AgentRunSchema.input.gameId` → `gameIds: string[]` (1–6).
  Add `maxGamesPerRun` to `TierCapabilities` (free `1`, Pro `6`). Add the three refusals from
  CONTRACT §1: `cross_game_locked`, `too_many_games`, `validation_error` for duplicates or an
  id outside the requested week.
  → Verify: `npm test` covers each refusal; `npm run build` clean. No `gameId` remains —
  `grep -rn "input.gameId" functions/src` returns nothing.

- [ ] **4. Per-game market scoping.** `validateDraft(draft, games[], constraints)`. Build the
  `teamToGame` map (CONTRACT §2), union the team check, and group by derived game before
  applying the spread/moneyline/total rule.
  → Verify: task 2's tests still pass unchanged, **plus** two new ones — two spreads in one
  game fails; one spread in each of two games passes.

- [ ] **5. `AIAnalysis` per game.** Reshape to `games[]` with `slateSummary?` (CONTRACT §4).
  Update `service/ai/schemas.ts` and `promptBuilder.ts`. A single-game run emits an array of
  one — no branch on length anywhere.
  → Verify: `npm test`; grep finds no `analysisSummary.gamePrediction` singular access left.

- [ ] **6. `AgentResult.games[]` + parallel fan-out + budget.** Move
  `game`/`homeStats`/`awayStats`/`odds`/`sources` inside `games[]`. Run per-game tool phases
  under one `Promise.all`; `odds` stays a single slate-wide call for the run. Scale
  `maxRunMs` as `90_000 + 20_000 * (gameIds.length - 1)`.
  → Verify: `npm test` — a two-game run resolves both games' tools concurrently (assert on a
  fake clock or call order, not wall time); single-game `maxRunMs` is still exactly 90_000.

- [ ] **7. Step progress + billing.** `AgentStep` gains optional
  `progress: { done: number; total: number }`, set only when a step spans more than one game.
  `finishRun` bills when succeeded **and every** game's `sources.odds === 'ok'`.
  → Verify: `npm test` — single-game emits `progress: undefined`; a run with one estimated
  game is not billed.

- [ ] **8. Pre-run odds read.** `GET /odds/week/:week` on `publicRouter` returning per-game,
  per-book `posted` plus lines (CONTRACT §8). Flip `fetchNflOdds`'s cache from
  `skipFirestore: true` to Firestore-backed so the 60s window is shared across instances.
  → Verify: `npm test` — a second call inside 60s makes no second fetch; response shape
  matches CONTRACT §8.

- [ ] **9. Update the web client.** `src/` and `shared/` consume the changed `AgentResult` and
  `AIAnalysis`, so web breaks at typecheck until it is updated. Render the per-game array.
  → Verify: `yarn type-check && yarn lint` clean at the repo root.

- [ ] **10. Full gate.** `cd functions && npm test && npm run lint && npm run build`, then
  `yarn lint && yarn type-check` at the root.
  → Verify: all green. Append to `HANDOFF.md`: what landed, and that **task 1 needs a deploy
  before six-game runs work in production**.

## Done When
- [ ] Ten tasks green, one commit each, branch pushed.
- [ ] `HANDOFF.md` flags the pending deploy and anything that looked wrong but was out of scope.

## Notes
- Task 2 before task 4 is deliberate: characterise the validator's current behaviour first, so
  the per-game change is proven not to have altered any existing rule.
- CONTRACT §9.2 option B — splitting the streaming route into its own function — is **not** in
  this plan. Task 1 is the one-line version. Revisit if held instance-seconds show up in the bill.
