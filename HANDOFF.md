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

**Closing-line capture skips cross-game parlays.** Each leg closes at its own
game's kickoff and
[`captureClosingLines.ts`](functions/src/scheduled/captureClosingLines.ts) is keyed
on one kickoff time, so capturing there would record a price taken hours before
the later games closed. `closingLines` stays absent, which is already a supported
state, and the sweep logs `skippedCrossGame`. A per-game capture needs a new
field and a Firestore index — its own piece of work.

**`GeneratedParlay` carries both `gameId` and `gameIds`.** `gameId` is
`gameIds[0]` and exists because `firestore.rules` requires the field on create.
Changing that rule needs a rules deploy that would break every client still
running the old bundle, so it is not this branch's to make. Once every client
writes `gameIds`, require it in the rule and drop `gameId`.

**Cross-game correlation is unproven.** Scoping one-leg-per-market per game
permits legs across games that nothing checks for correlation — two road
favourites in the same weather system, say. The prompt asks the model to avoid
it and to say so if it stacks anyway; there is no rule enforcing it.
