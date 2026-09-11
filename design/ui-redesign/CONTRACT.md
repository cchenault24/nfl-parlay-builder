# Multi-game run contract

Companion to `DESIGN.md`. Defines the API and schema changes behind batch and
cross-game parlays, and the pre-run odds read.

---

## 0. The constraint that shapes everything

**Execution rides the SSE request, not the POST.** `POST /agent/runs` only creates a
queued run; `GET /agent/runs/:id/stream` claims it atomically and drives it to
completion, because Cloud Run throttles CPU to near-zero once a response is sent
([agent.ts:213](../../functions/src/routes/agent.ts)).

Consequences:

- **N runs = N held-open requests**, and N against `PRO_RUNS_PER_DAY = 10` (§7). Batch cannot fan out concurrently on the client
  Batch cannot fan out concurrently on the client without holding N connections and N
  Cloud Run instance-seconds.
- **One cross-game run = one stream.** Server-side fan-out is *operationally cheaper*
  than client-side batch, the opposite of what the API surface suggests.

---

## 1. Run input — `gameIds`

```ts
input: {
  gameIds: z.array(z.string().min(1)).min(1).max(6),   // was: gameId: string
  riskLevel: RiskLevelSchema,
  legCount: z.number().int().min(2).max(6).default(3),
  playerProps: z.boolean().default(false),
  bookmaker: z.string().optional(),
}
```

`gameId` is **removed, not deprecated** — no shim. `shared/api/` is consumed by both
clients, so one change updates web and mobile together.

New refusals on `POST /agent/runs`:

| Condition | Code | Status |
|---|---|---|
| `gameIds.length > 1` and tier lacks cross-game | `cross_game_locked` | 403 |
| `gameIds.length > capabilities.maxGamesPerRun` | `too_many_games` | 403 |
| duplicate ids, or an id not in the requested week | `validation_error` | 400 |

`TierCapabilities` gains `maxGamesPerRun: number` — free `1`, Pro `6`. See §9: six is
the leg-count ceiling, so every leg can come from its own game, and it forces three
changes that a smaller cap would not.

## 2. Leg → game is derived, never declared

A team plays once per week, so `leg.team` uniquely identifies its game within a run.
The model is **not** asked to emit a `gameId` per leg — it would invent them.

```ts
const teamToGame = new Map<string, ScheduleGame>()  // both teams of every game
```

A leg whose `team` is in no requested game is a validation failure, as today.

## 3. `validateDraft` — per-game market scoping

```ts
validateDraft(draft, games: ScheduleGame[], constraints)   // was: game: ScheduleGame
```

Changes, all of them local to [validate.ts](../../functions/src/agent/validate.ts):

- `teams` becomes the union across `games`.
- The one-leg-per-market rule (currently draft-wide, [validate.ts:76](../../functions/src/agent/validate.ts))
  groups legs by derived game first, then applies `spread`/`moneyline`/`total` within
  each group. Two spread legs in one game still fail; a spread in each of two games is
  legal and is the whole point of the feature.
- The winner check runs per game prediction (§4).

Unchanged: leg-count, odds range, player-prop gating, the anchored-confidence rule.

## 4. `AIAnalysis` becomes per-game

Today `AIAnalysis` is `{ gamePrediction, matchupSummary, keyFactors }` — singular, and
meaningless for a slate.

```ts
interface AIAnalysis {
  games: {
    gameId: string
    gamePrediction: { winner: string; projectedScore: {home,away}; winProbability: number }
    matchupSummary: string
    keyFactors: string[]
  }[]
  slateSummary?: string     // only when games.length > 1
}
```

A single-game run returns an array of one. **No shape varies by run size** — special-casing
by length is how the leg-count default bug happened (`finish-the-app.md`, #97).

Ripples: `service/ai/schemas.ts`, `promptBuilder.ts`, `validate.ts`, and `GameSummaryView`
in both clients.

## 5. `AgentResult` becomes per-game

```ts
interface AgentResult {
  parlay: { legs: ProcessedLeg[]; combinedOdds: number; parlayConfidence: number
            gameSummary: AIAnalysis }
  games: { game: ScheduleGame; homeStats: TeamStats|null; awayStats: TeamStats|null
           odds: OddsSnapshot|null
           sources: { stats: SourceStatus; odds: SourceStatus; weather: SourceStatus } }[]
  model: string
}
```

`game`/`homeStats`/`awayStats`/`odds`/`sources` move inside `games[]`.

## 6. Billing — one run is one generation

`finishRun` bills when the run succeeded **and every game in it returned `odds: 'ok'`**
([firestore.ts:88](../../functions/src/agent/store/firestore.ts)). A six-game cross-game
parlay costs one generation; six separate batch runs cost six. That is correct — one
parlay is one product — and cross-game is Pro-only, so it cannot be used to stretch the
free allowance.

If any game fell back to estimated prices, the whole run is free, preserving today's rule
that you only pay for a fully book-priced parlay.

Note this makes cross-game the cheaper path in **both** currencies: one weekly generation
instead of six, and one run against `PRO_RUNS_PER_DAY` instead of six (§7).

## 7. Batch needs no backend change — but it is expensive against the daily valve

N single-game runs, created and streamed **sequentially** by the client — forced by §0.
The Build list shows queued / running / done / failed per row; quota decrements once per
successful run via the existing path. No new endpoint, no budget primitive.

**`PRO_RUNS_PER_DAY = 10`** ([capabilities.ts](../../functions/src/tiering/capabilities.ts))
is enforced as a second rate limit on run creation. It changes what batch costs:

| Action | Runs spent | Share of a Pro day |
|---|---|---|
| One six-game **cross-game** parlay | 1 | 10% |
| Six-game **batch** | 6 | 60% |

Two consequences:

- **The UI must state the cost before the tap**, the way free's weekly quota already is.
  A Pro user with 4 runs left who selects six games must be told, not discover it when
  runs 5 and 6 fail.
- **It is a rate limit, not a quota**, so overflow returns `rate_limit_reached` with a
  reset time rather than a quota error. A batch that trips it mid-flight leaves earlier
  results intact — the per-row failed state (DESIGN.md §4.2) already covers the display.

A per-batch budget primitive is still **not required**: the daily valve already bounds it,
and the fix is disclosure rather than a new server-side limit.

## 8. Pre-run odds — expose the cache that already exists

`fetchNflOdds()` fetches the **whole slate in one request** and caches it for 60s
([client.ts:89](../../functions/src/providers/odds/client.ts)). Reading it costs nothing
extra.

```
GET /odds/week/:week      →  { fetchedAt, games: [{ gameId,
                                books: [{ key, title, posted, spread?, total?, moneyline? }] }] }
```

- On `publicRouter` beside `/season` and `/games`, shaped by the same schedule lookup.
- **Change `skipFirestore: true` → Firestore-backed** so the 60s cache is shared across
  Cloud Run instances rather than per-instance. Without this, credit spend scales with
  instance count.
- Serves both the game-detail lines panel and per-book availability (`posted`) for the
  Pro settings sheet.

Per-slate, not per-game: there is no reason to add a `/games/:id/odds` route when one
document already holds every game.

---

## 9. What a cap of 6 forces

Six games against today's `maxRunMs: 90_000` and `perToolTimeoutMs: 15_000` does not fit.
Per game the orchestrator runs `espn_game`, `espn_team_stats`, `espn_pregame` and
`nflverse_epa` — roughly 24 tool calls at six games, against a budget sized for four.
Three changes come with the cap:

**9.1 Per-game tool fan-out must be parallel.** The games are independent, so their tool
phases run under one `Promise.all` rather than in sequence. Without this the tool phase
alone can exceed the whole budget. `odds` stays a single slate-wide call (§8) and is
fetched once for the run, not once per game.

**9.2 `maxRunMs` scales with game count — and the platform timeout must move first.**

```ts
maxRunMs: 90_000 + 20_000 * (gameIds.length - 1)    // 1 game → 90s, 6 games → 190s
```

Single-game behaviour is unchanged by construction. But **190s does not fit**:
[`index.ts:106`](../../functions/src/index.ts) sets `timeoutSeconds: 120` on the whole
`api` function, and the stream is held open for the entire run. Today's 90s budget clears
it with 30s to spare; anything past two games does not. **A cap of 6 is not reachable
without changing this.** Two ways:

| | Change | Cost |
|---|---|---|
| **A (recommended)** | Raise `timeoutSeconds` to `300` on `api` | One line. Raises the ceiling for *every* route, so a hung request can hold an instance 5× longer. Cloud Run multiplexes requests per instance, so the real exposure is modest. |
| **B** | Split `/agent/runs/:id/stream` into its own function with its own timeout, leave `api` at 120s | Correct architecture — a long-lived streaming endpoint has different timeout and concurrency characteristics from CRUD routes — and contains the blast radius. Needs a hosting rewrite for the new function and a deploy-order change. |

Take **A** now because it is one line and unblocks the cap; treat **B** as the follow-up
if held instance-seconds show up in the bill. Either way this must land *before* the cap
is raised, or six-game runs fail at 120s having already spent the model tokens.

**9.3 The step timeline must not multiply.** `AgentProgress` renders eight fixed rows.
Six games must **not** become forty-eight rows. The eight conceptual steps stay, and a
multi-game run reports progress *within* a row:

```
Pull team statistics          4 of 6
```

So `AgentStep` gains optional `progress: { done: number; total: number }`, set only when
a step covers more than one game. Single-game runs emit it as `undefined` and the row
renders exactly as it does today.

**9.4 The wait copy is no longer honest.** "Runs usually take 20–60 seconds" is wrong at
six games. It becomes a function of `gameIds.length`.

---

## Settled

- **§4 — per-game array, uniform shape.** A single-game run returns an array of one;
  nothing varies by run size.
- **§1 — `maxGamesPerRun`: free 1, Pro 6**, with §9 as the price of six.

## Blocking

**§9.2 must ship before the cap.** `timeoutSeconds: 120` caps a run at roughly two games.
Raising `maxGamesPerRun` to 6 without it produces runs that burn model tokens and then die
at the platform timeout — the user pays nothing (§6 bills only on success) but waits three
minutes for a failure.
