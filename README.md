<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/parlaid-wordmark-white.png">
    <img src="public/parlaid-wordmark-black.png" alt="ParlAId — AI powered NFL parlay generator" width="520">
  </picture>
</p>

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
- **API** (`functions/`): Firebase Functions v2 (`api`), Express, Zod, openai v7. In-memory + Firestore cache with request collapsing (`cache/CacheClient.ts`). On deployed Hosting, `/api/**` is rewritten same-origin straight to this function (`firebase.json`) — the Express app is mounted at both `/` and `/api` since Hosting forwards the original path unstripped, while a direct Cloud Functions URL consumes `api` (the function's name) as its own first segment. Local dev always hits the Functions emulator directly.
- Firestore collections: `agentRuns/{id}/steps`, `cache`, `rate_limits` (server only); `users`, `parlays` (client, see `firestore.rules`).

## Local development

```bash
yarn install && (cd functions && npm install)
cp .env.example .env.local   # emulator config; the committed defaults just work
npm run dev                  # loads secrets, starts the emulator suite, then Vite on :3000
```

Local dev runs entirely on the emulator suite — **Auth, Firestore, and Functions** — against the fake project `demo-parlaid`. No cloud project is involved, and the `demo-` prefix makes the Firebase SDKs refuse to reach a real backend, so a misconfigured run fails loudly instead of touching production. Firestore requests are checked against `firestore.rules`, so rule changes are testable before deploy.

`start-dev.js` still pulls `OPENAI_API_KEY` and `ODDS_API_KEY` from the **prod** project via `firebase functions:secrets:access` (the emulated project has no Secret Manager), then waits for `/api/health`. Emulator state persists to `.emulator-data/` on exit and is re-imported on the next start, so signed-in users and saved parlays survive a restart; delete that directory for a clean slate. The emulator UI is at `http://127.0.0.1:4000`.

Run `npm run build:functions` after backend changes — the emulator serves `functions/lib`. In development a **Mock data** toggle (bottom-right) swaps the live agent for a deterministic local mock that emits the same step timeline.

Checks: `npm run type-check`, `npm run lint`, `npm run build`, and in `functions/`: `npm run build`, `npm run lint`.

## Deploy

```bash
firebase deploy --project prod   # functions + hosting + firestore rules
```

Merging to `main` runs `deploy-production.yml`, which deploys functions + Firestore rules and then Hosting. Every PR to `main` gets a prod-backed preview channel (`deploy-main-pr.yml`). `nfl-parlay-builder` is the only Firebase project — there is no separate dev or staging project.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | liveness |
| GET | `/api/season` | — | season + per-week summary (drives the week picker and current-week detection) |
| GET | `/api/games?week=N` | — | games for one week |
| POST | `/api/agent/runs` | Bearer | start a run `{ gameId, riskLevel }` (20/hour per user) |
| GET | `/api/agent/runs/:id` | Bearer | run record |
| GET | `/api/agent/runs/:id/stream` | Bearer | SSE: `step`, `status`, `final`, `error` |
| POST | `/api/agent/runs/:id/cancel` | Bearer | cancel a queued/running run |
| GET | `/api/agent/rate-limit` | Bearer | remaining runs this hour |
| GET | `/api/metrics`, `/api/metrics/health` | — | in-process counters |
