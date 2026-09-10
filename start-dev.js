#!/usr/bin/env node

import { execSync, spawn } from 'child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// The emulator resolves every defineSecret() param, and for anything it cannot
// find locally it calls Secret Manager on the *emulated* project — which does
// not exist, so one unlisted secret 403s and no functions load at all. Scanning
// the source keeps this list from going stale as secrets are added.
function declaredSecrets(dir = 'functions/src') {
  const names = new Set()
  const walk = d => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.ts')) {
        for (const m of readFileSync(full, 'utf8').matchAll(
          /defineSecret\(\s*['"`]([A-Z0-9_]+)['"`]/g
        )) {
          names.add(m[1])
        }
      }
    }
  }
  walk(dir)
  return [...names].sort()
}

// Auth and Firestore are emulated too, so local dev needs no cloud project at
// all. The `demo-` prefix makes the SDKs refuse to reach a real backend, so a
// misconfigured run fails loudly instead of touching production.
// Keep in sync with LOCAL_PROJECT_ID in src/config/api.ts.
const LOCAL_PROJECT_ID = 'demo-parlaid'

// Emulator Auth users and Firestore docs are in-memory; persist them here so a
// restart does not mean signing in and regenerating everything again.
const DATA_DIR = '.emulator-data'

function readProjectId() {
  try {
    const env = readFileSync('.env.local', 'utf8')
    const match = env.match(/^VITE_FIREBASE_PROJECT_ID=(.+)$/m)
    if (match) {
      return match[1].trim()
    }
  } catch {
    // fall through
  }
  return LOCAL_PROJECT_ID
}

// The emulated project is a local fiction, so secrets still come from the real
// billed prod project.
function readSecretsProject() {
  try {
    return JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.prod
  } catch {
    return 'nfl-parlay-builder'
  }
}

const projectId = readProjectId()
const secretsProject = readSecretsProject()
const healthUrl = `http://localhost:5001/${projectId}/us-central1/api/health`

let emulator = null
let frontend = null

// Written to functions/.secret.local (gitignored) because that is the only
// source the emulator consults before falling back to Secret Manager;
// process.env alone does not satisfy a defineSecret param.
function loadSecrets() {
  const missing = []
  const resolved = []
  for (const name of declaredSecrets()) {
    try {
      const value = execSync(
        `firebase functions:secrets:access ${name} --project ${secretsProject}`,
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim()
      if (value) {
        process.env[name] = value
        resolved.push(`${name}=${value}`)
      } else {
        missing.push(name)
      }
    } catch {
      missing.push(name)
    }
  }
  // Placeholders keep an unset secret from reaching Secret Manager; a route
  // that needs one still fails, but every other function loads and runs.
  for (const name of missing) {
    resolved.push(`${name}=missing-locally`)
  }
  writeFileSync('functions/.secret.local', `${resolved.join('\n')}\n`)
  return missing
}

async function waitForEmulator(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl)
      if (res.ok) {
        return true
      }
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 1500))
  }
  return false
}

function startFrontend() {
  frontend = spawn('npm', ['run', 'dev:frontend'], { stdio: 'inherit', shell: true })
  frontend.on('exit', code => {
    if (code) {
      console.log(`Frontend exited with code ${code}`)
    }
  })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    frontend?.kill(signal)
    emulator?.kill(signal)
    process.exit(0)
  })
}

console.log(`Project: ${projectId} (secrets from ${secretsProject})`)
const missing = loadSecrets()
if (missing.length > 0) {
  console.log(
    `Missing secrets: ${missing.join(', ')} — stubbed locally, so the emulator runs, but routes needing them will fail.`
  )
}

const emulatorArgs = [
  'emulators:start',
  '--only',
  'functions,auth,firestore',
  '--project',
  projectId,
  '--export-on-exit',
  DATA_DIR,
]
// --import on a directory with no export metadata aborts the whole suite.
if (existsSync(`${DATA_DIR}/firebase-export-metadata.json`)) {
  emulatorArgs.push('--import', DATA_DIR)
}

emulator = spawn('firebase', emulatorArgs, { stdio: 'inherit', shell: true })
emulator.on('exit', code => {
  if (code) {
    console.log(`Emulator exited with code ${code}`)
  }
})

const ready = await waitForEmulator()
console.log(
  ready
    ? `Emulators ready — API ${healthUrl}, UI http://127.0.0.1:4000`
    : 'Functions emulator did not become ready; the app will fail to load games until it does.'
)
startFrontend()
