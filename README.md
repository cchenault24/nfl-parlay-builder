# NFL Parlay Builder (ParlAId)

Generate data-driven 3-leg NFL parlays using real game data (ESPN) and AI (OpenAI).

- Frontend: React + Vite + MUI + React Query + Zustand
- Backend: Firebase Cloud Functions v2 (Express), Firestore cache and idempotency
- Auth: Firebase Authentication (required for parlay generation)
- AI: OpenAI `gpt-4o-mini` with strict JSON output

## Architecture

- `src/` – React app and UI components
- `functions_v2/` – Cloud Functions v2 (Express app mounted at `/api`)
  - Public routes: health, current week, games (rate-limited by IP)
  - Protected route: parlay generation (rate-limited by user, requires Firebase ID token)
  - Firestore-backed caching (`v2_cache`) and idempotency (`v2_idempotency`)

## Backend API (v2)

Base URL depends on environment:

- Local emulator: `http://localhost:5001/nfl-parlay-builder-dev/us-central1`
- Cloud (dev project): `https://us-central1-nfl-parlay-builder-dev.cloudfunctions.net`

All endpoints are under `/api/v2/*`.

### Health
- Method: GET
- Path: `/api/v2/health`
- Auth: none
- Response: `{ ok: true }`

### Current Week
- Method: GET
- Path: `/api/v2/weeks/current`
- Auth: none
- Rate limit: 120/min per IP
- Response:
  ```json
  { "week": 7 }
  ```

### Games for Week
- Method: GET
- Path: `/api/v2/games?week=NUMBER`
- Auth: none
- Rate limit: 120/min per IP
- Response (array, shape abbreviated):
  ```json
  [
    {
      "gameId": "401547405",
      "week": 7,
      "startTime": "2025-10-19T17:00:00Z",
      "status": "scheduled",
      "home": { "teamId": "26", "name": "Dallas Cowboys", "abbrev": "DAL", "record": "4-2", "overallRecord": "4-2", "homeRecord": "2-1", "roadRecord": "2-1" },
      "away": { "teamId": "22", "name": "New York Giants", "abbrev": "NYG", "record": "2-4", "overallRecord": "2-4", "homeRecord": "1-2", "roadRecord": "1-2" },
      "venue": { "name": "AT&T Stadium", "city": "Arlington", "state": "TX" },
      "leaders": { "passing": {"name": "...", "stats": "...", "value": 0 } }
    }
  ]
  ```

### Generate Parlay
- Method: POST
- Path: `/api/v2/parlays/generate`
- Auth: Firebase ID token in `Authorization: Bearer <token>`
- Rate limit: 10 requests per 30 minutes per user
- Optional idempotency: include `Idempotency-Key: <opaque string>` header to dedupe/replay for 24h
- Request body (validated with Zod):
  ```json
  {
    "gameId": "401547405",
    "numLegs": 3,
    "week": 7,
    "riskLevel": "conservative",
    "betTypes": "all"
  }
  ```
- Response (abbreviated):
  ```json
  {
    "parlayId": "pl_xxxxxxxx",
    "gameId": "401547405",
    "gameContext": "Giants @ Cowboys - Week 7",
    "legs": [
      { "betType": "moneyline", "selection": "Cowboys ML", "odds": -150, "confidence": 0.65, "reasoning": "..." },
      { "betType": "total", "selection": "Over 47.5", "odds": -110, "confidence": 0.6, "reasoning": "..." },
      { "betType": "player_passing_yards", "selection": "Dak Prescott Over 250.5", "odds": -110, "confidence": 0.58, "reasoning": "..." }
    ],
    "combinedOdds": -103,
    "parlayConfidence": 0.58,
    "gameSummary": {
      "matchupSummary": "...",
      "keyFactors": ["..."],
      "gamePrediction": {
        "winner": "Cowboys",
        "projectedScore": {"home": 28, "away": 20},
        "winProbability": 0.64
      }
    },
    "rosterDataUsed": {
      "home": [{ "playerId": "...", "name": "..." }],
      "away": [{ "playerId": "...", "name": "..." }]
    }
  }
  ```
- Error responses are normalized JSON with `code`, `message`, `status`, `correlationId`.
  - 401 `unauthorized` when token is missing/invalid
  - 429 `rate_limited` when user/IP limit exceeded
  - 400 `validation_error` when request body is invalid
  - 503 `ai_service_unavailable` when `OPENAI_API_KEY` is not configured

## Rate Limiting, Caching, Idempotency

- Public endpoints: 120 requests/minute per IP (Firestore-backed counters in `v2_rate_limits`).
- Protected parlay generation: 10 requests/30 minutes per user.
- Cache: Firestore `v2_cache` documents with `updatedAt` TTL checks; helpers `getCached`/`setCached`.
- Idempotency: Provide `Idempotency-Key` to replay same computed response for 24h, stored in `v2_idempotency`.

## AI Integration

- Model: `gpt-4o-mini` via `openai` SDK
- Strict JSON enforced with `response_format: { type: 'json_object' }`
- Prompt includes matchup data (records, venue, leaders, weather when available) and risk guidance
- Timeouts: 30s; failures and schema parse errors return `null` -> 503 to client

## Frontend

- Uses `API_CONFIG` to choose base URL:
  - Local (when running on localhost): emulator base
  - Hosted (web.app/firebaseapp.com): cloud base
- `ParlayService` handles auth token retrieval and calls `/api/v2/parlays/generate`.
- `useCurrentWeek` and `useNFLGames` call the public v2 endpoints and transform responses to UI types.
- State with Zustand; data fetching with React Query; UI with MUI.

## Local Development

### Prerequisites
- Node.js >= 20
- Firebase CLI (`npm i -g firebase-tools`) and login (`firebase login`)
- OpenAI API Key (store as Firebase secret)

### Setup
1. Install dependencies:
   ```bash
   npm install
   (cd functions_v2 && npm install)
   ```
2. Set Firebase secret for OpenAI (one-time):
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```
3. Create `.env.local` with your Firebase web config for the frontend:
   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=nfl-parlay-builder-dev
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

### Run
- Single command (starts emulator and frontend after health is up):
  ```bash
  npm run dev
  ```
  This script:
  - Loads `OPENAI_API_KEY` via `start-emulator.sh`
  - Starts Functions emulator only
  - Waits for `/api/v2/health`
  - Starts Vite dev server

- Alternatively, run pieces separately if needed:
  ```bash
  ./start-emulator.sh
  npm run dev:frontend
  ```

### Useful scripts
- Frontend build: `npm run build`
- Frontend lint: `npm run lint` / `npm run lint:fix`
- Functions build (from `functions_v2/`): `npm run build`

## Deployment (dev project)
- Ensure Node 20 runtime and OPENAI secret exist in project
- Deploy:
  ```bash
  firebase deploy --only functions
  # and/or hosting if configured
  firebase deploy --only hosting
  ```

## CORS
Allowed origins (in Functions):
- `http://localhost:3000`, `http://localhost:3001`
- `https://nfl-parlay-builder.web.app`
- Dev hosting preview channels under `nfl-parlay-builder-dev` (`https://nfl-parlay-builder-dev--*.web.app`)

## Troubleshooting
- 503 `ai_service_unavailable`: set `OPENAI_API_KEY` secret and restart emulator/deploy
- 401 `unauthorized`: ensure Firebase ID token present in `Authorization: Bearer ...`
- 429 `rate_limited`: wait for reset window (30 min for protected route)
- `Failed to fetch current week/games`: ESPN API intermittently fails; retry later

## Legal & Responsible Use
- Educational/entertainment purposes only. Not financial advice.
- Includes age verification and responsible gambling content in UI.
