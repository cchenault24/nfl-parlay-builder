#!/usr/bin/env node

import { execSync, spawn } from 'child_process'
import { readFileSync } from 'fs'

const SECRETS = ['OPENAI_API_KEY', 'ODDS_API_KEY']

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
  return 'nfl-parlay-builder-dev'
}

// Secrets live on the billed prod project; the dev project is on Spark.
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

function loadSecrets() {
  const missing = []
  for (const name of SECRETS) {
    try {
      const value = execSync(
        `firebase functions:secrets:access ${name} --project ${secretsProject}`,
        { encoding: 'utf8', stdio: 'pipe' }
      ).trim()
      if (value) {
        process.env[name] = value
      } else {
        missing.push(name)
      }
    } catch {
      missing.push(name)
    }
  }
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
    `Missing secrets: ${missing.join(', ')} — the emulator will run, but runs needing them will fail.`
  )
}

emulator = spawn(
  'firebase',
  ['emulators:start', '--only', 'functions', '--project', projectId],
  { stdio: 'inherit', shell: true }
)
emulator.on('exit', code => {
  if (code) {
    console.log(`Emulator exited with code ${code}`)
  }
})

const ready = await waitForEmulator()
console.log(
  ready
    ? `Functions emulator ready at ${healthUrl}`
    : 'Functions emulator did not become ready; the app will fail to load games until it does.'
)
startFrontend()
