# ParlAId (nfl-parlay-builder)

AI-powered NFL parlay generator built with Vite + React (TypeScript) and Firebase Functions v2 (Express). Fetches real-time NFL data from ESPN, generates 3-leg parlays with OpenAI, and stores user history in Firestore.

## Tech stack
- Frontend: Vite, React 18, TypeScript, MUI, TanStack Query, Zustand
- Backend: Firebase Functions v2 (Node 20), Express, Firebase Admin, Zod
- Data: ESPN public API, Firestore (caching, rate limits, idempotency, user parlays)
- Tooling: ESLint (flat config), Prettier, GitHub Actions

## Repository layout
```
.
├─ src/                         # React app (Vite)
│  ├─ components/               # UI (auth, display, legal, etc.)
│  ├─ config/                   # api + firebase config
│  ├─ hooks/                    # data fetching + parlay generation hooks
│  ├─ services/                 # ParlayService (calls Cloud Function)
│  └─ types/ utils/ store/ ...
├─ functions_v2/                # Firebase Functions v2 (Express app)
│  ├─ src/
│  │  ├─ index.ts               # Express app + CORS + health + routers
│  │  ├─ routes/public          # GET /v2/weeks/current, GET /v2/games
│  │  ├─ routes/protected       # POST /v2/parlays/generate (auth req'd)
│  │  ├─ middleware             # auth + rate limiting
│  │  ├─ providers/espn.ts      # ESPN data fetchers
│  │  └─ service/ai/            # OpenAI integration
│  └─ tsconfig.json
├─ .github/workflows/           # CI for hosting + functions deploys
├─ firebase.json                # Hosting + emulator + functions config
├─ firestore.rules              # Firestore security rules
├─ .env.example                 # Copy to .env and fill values
└─ vite.config.ts, eslint.config.ts, tsconfig*.json, etc.
```

## Prerequisites
- Node.js 20+
- Yarn (recommended)
- Firebase CLI (`npm i -g firebase-tools`) and login (`firebase login`)

## Environment variables
Copy `.env.example` to `.env` at repo root and fill the values (required for the frontend):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Optional:
- `CLEANUP_TOKEN` (present in example; currently not used by the codebase)

Secrets for backend (Functions):
- `OPENAI_API_KEY` stored in Firebase Secret Manager
  - Set for the dev project: `firebase functions:secrets:set OPENAI_API_KEY --project nfl-parlay-builder-dev`
  - Set for prod project: `firebase functions:secrets:set OPENAI_API_KEY --project nfl-parlay-builder`

## Install
```bash
# In repo root
yarn install

# Install functions deps
yarn --cwd functions_v2 install
```

## Local development
The root dev script starts the Functions emulator (with OpenAI secret) and the Vite dev server.

```bash
yarn dev
# or: npm run dev
```
- Frontend: http://localhost:3000
- Functions emulator: http://localhost:5001/nfl-parlay-builder-dev/us-central1/api
- Emulator UI: http://localhost:4000

Notes:
- The script `dev:functions:secure` runs `start-emulator.sh`, which loads `OPENAI_API_KEY` from Firebase Secret Manager before starting the Functions emulator.
- If you edit backend TypeScript and the emulator doesn't auto-reload, you can run a compiler watch in another terminal:
  ```bash
  yarn --cwd functions_v2 dev
  ```

## Build and preview
```bash
yarn build
# Local static preview (serves dist)
yarn preview
```

## Lint and format
```bash
yarn lint
yarn lint:fix
yarn format
```

## Cloud Functions API
Exported as a single HTTPS function named `api` that mounts an Express app.

Base URLs:
- Local emulator: `http://localhost:5001/nfl-parlay-builder-dev/us-central1/api`
- Production (example): `https://us-central1-nfl-parlay-builder.cloudfunctions.net/api`

Endpoints (mounted under `/v2`):
- GET `/v2/health` — health check
- GET `/v2/weeks/current` — current NFL week (public, IP rate limited 120 req/60s)
- GET `/v2/games?week=NUMBER` — games for week (public, IP rate limited 120 req/60s)
- POST `/v2/parlays/generate` — generate 3-leg parlay (requires Firebase ID token)
  - Headers: `Authorization: Bearer <Firebase ID token>`
  - Optional: `Idempotency-Key: <opaque-string>` for safe retries (24h replay)
  - Body (JSON):
    ```json
    {
      "gameId": "<ESPN event id>",
      "numLegs": 3,
      "week": 5,
      "riskLevel": "conservative",
      "betTypes": "all"
    }
    ```
  - Rate limit: 10 requests per 30 minutes per user

CORS allowlist (in `functions_v2/src/index.ts`):
- `http://localhost:3000`, `http://localhost:3001`
- `https://nfl-parlay-builder.web.app`
- Dev preview channels for `nfl-parlay-builder-dev` (`https://nfl-parlay-builder-dev--<channel>.web.app`)

Firestore usage (server side):
- `v2_cache` (TTL-based cache)
- `v2_rate_limits` (per-IP and per-user rate limiting)
- `v2_idempotency` (response replay keyed by user + idempotency key)

## Frontend configuration
- API base URL is defined in `src/config/api.ts`.
  - Local: points to the emulator under the dev project id.
  - NOTE: The production base URL currently references the dev project (`nfl-parlay-builder-dev`). Update this if you intend to call prod functions from prod hosting.
- Firebase client configuration is read from `import.meta.env.VITE_*` vars in `src/config/firebase.ts`.

## Deployment
GitHub Actions are set up for both Hosting and Functions deploys.

- Hosting (Production): `.github/workflows/firebase-hosting-merge.yml`
  - Triggers on push to `main`
  - Builds with `VITE_*` secrets and deploys to `nfl-parlay-builder` Hosting
- Hosting (PR Previews): `.github/workflows/firebase-hosting-pull-request.yml`
  - Triggers on PRs
  - Builds with `VITE_*_DEV` secrets and deploys previews to `nfl-parlay-builder-dev`
- Functions v2: `.github/workflows/deploy-functions-v2.yml`
  - Triggers on push to `main` and `dev`
  - Uses `FIREBASE_SERVICE_ACCOUNT` JSON to deploy `functions_v2` `api` function

Required GitHub secrets (examples):
- Hosting (prod):
  - `FIREBASE_SERVICE_ACCOUNT_NFL_PARLAY_BUILDER`
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Hosting (dev previews):
  - `FIREBASE_SERVICE_ACCOUNT_NFL_PARLAY_BUILDER_DEV`
  - `VITE_FIREBASE_API_KEY_DEV`, `VITE_FIREBASE_AUTH_DOMAIN_DEV`, `VITE_FIREBASE_PROJECT_ID_DEV`, `VITE_FIREBASE_STORAGE_BUCKET_DEV`, `VITE_FIREBASE_MESSAGING_SENDER_ID_DEV`, `VITE_FIREBASE_APP_ID_DEV`
- Functions deploys:
  - `FIREBASE_SERVICE_ACCOUNT` (JSON service account with deploy perms)

Manual deploys (optional):
```bash
# Hosting
yarn build
firebase deploy --only hosting --project nfl-parlay-builder

# Functions (only the API function)
firebase deploy --only functions:api --project nfl-parlay-builder
```

## Troubleshooting
- 401 Unauthorized when calling `/v2/parlays/generate`: ensure the frontend sends a valid Firebase ID token in `Authorization: Bearer <token>`.
- 429 Rate limited: you exceeded the per-user or per-IP limits. Wait for the window to reset.
- CORS error in local dev: confirm your origin is in the allowlist in `functions_v2/src/index.ts`.
- Emulator missing `OPENAI_API_KEY`: make sure the secret is set in Firebase Secret Manager for the selected project; the `start-emulator.sh` script reads it at startup.

## License
Proprietary or TBD (update as needed).
