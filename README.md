# ParlAId — NFL Parlay Builder

AI-generated 3-leg NFL parlays for entertainment. Pick a game, choose a risk level, and an agent gathers real data, drafts a parlay with `gpt-5.6-terra`, and validates every market leg against the posted book line before showing it.

**Entertainment only. 18+. No bets are placed on this platform.**

## How a run works

1. `POST /api/agent/runs` creates a run and returns immediately.
2. The orchestrator (`functions/src/agent/orchestrator/agent.ts`) executes steps, persisting each to Firestore as `running → ok | failed`:
   - `plan`
   - `tool:espn_game` — schedule row, venue (indoor/outdoor, neutral site), records, kickoff forecast
   - `tool:espn_team_stats` — per-game offense/defense with league ranks and home/road splits (falls back to the prior season until a team has played)
   - `tool:odds` — spread, total, and moneyline with prices from the first available book (DraftKings → FanDuel → BetMGM → Caesars)
   - `draft` — structured-output call via `responses.parse`
   - `validate` — spread/total/moneyline legs must match the book's exact line and price; at most one leg per market; teams and winner must belong to the game
3. `GET /api/agent/runs/:id/stream` (SSE) pushes each step change, then `final` or `error`. The UI renders that as a live timeline.

No synthetic fallbacks: if a tool fails the run continues, the prompt says the data is unavailable, the result carries a `sources` summary, and the UI tells the user which prices are AI estimates. Runs are never auto-retried.

## Data sources

| Data | Source | Key |
|---|---|---|
| Schedule, venues, records, stat ranks, kickoff forecast | ESPN public JSON API (`site.api.espn.com`, `sports.core.api.espn.com`) — undocumented, no SLA | none |
| Book lines | [The Odds API](https://the-odds-api.com) v4 | `ODDS_API_KEY` |
| Parlay draft | OpenAI `gpt-5.6-terra` | `OPENAI_API_KEY` |

Secrets live in Firebase Secret Manager (`firebase functions:secrets:set NAME`).

## Stack

- **Web** (`src/`): Vite, React 18, TypeScript, MUI, TanStack Query, Zustand, Firebase Auth/Firestore.
- **API** (`functions/`): Firebase Functions v2 (`api`), Express, Zod, openai v7. In-memory + Firestore cache with request collapsing (`cache/CacheClient.ts`).
- Firestore collections: `agentRuns/{id}/steps`, `cache`, `rate_limits` (server only); `users`, `parlays` (client, see `firestore.rules`).

## Local development

```bash
yarn install && (cd functions && npm install)
cp .env.example .env.local   # Firebase web config for the project you target
npm run dev                  # loads secrets, starts the Functions emulator, then Vite on :3000
```

`start-dev.js` reads `VITE_FIREBASE_PROJECT_ID` from `.env.local`, pulls `OPENAI_API_KEY` and `ODDS_API_KEY` via `firebase functions:secrets:access`, and waits for `/api/health`. The emulated function uses that project's real Firestore (`agentRuns`, `rate_limits`, `cache`) through the Firebase CLI's credentials. Run `npm run build:functions` after backend changes — the emulator serves `functions/lib`. In development a **Mock data** toggle (bottom-right) swaps the live agent for a deterministic local mock that emits the same step timeline.

Checks: `npm run type-check`, `npm run lint`, `npm run build`, and in `functions/`: `npm run build`, `npm run lint`.

## Deploy

```bash
firebase deploy --project prod   # functions + hosting + firestore rules
```

Merging to `main` runs `deploy-production.yml`, which deploys functions + Firestore rules and then Hosting. Every PR to `main` gets a prod-backed preview channel (`deploy-main-pr.yml`). `nfl-parlay-builder-dev` (Spark plan) only provides Auth/Firestore for local development; it has no API.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | liveness |
| GET | `/api/schedule` | — | full regular-season schedule for the current season |
| GET | `/api/games?week=N` | — | games for one week |
| POST | `/api/agent/runs` | Bearer | start a run `{ gameId, riskLevel }` (20/hour per user) |
| GET | `/api/agent/runs/:id` | Bearer | run record |
| GET | `/api/agent/runs/:id/stream` | Bearer | SSE: `step`, `status`, `final`, `error` |
| POST | `/api/agent/runs/:id/cancel` | Bearer | cancel a queued/running run |
| GET | `/api/agent/rate-limit` | Bearer | remaining runs this hour |
| GET | `/api/metrics`, `/api/metrics/health` | — | in-process counters |
