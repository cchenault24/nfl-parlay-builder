#!/usr/bin/env node

import { execSync, spawn } from 'child_process'

/**
 * Start development environment with fallback to deployed functions
 */

console.log('🚀 Starting development environment...')

let emulatorProcess = null
let frontendProcess = null
let isEmulatorReady = false
let emulatorStartAttempted = false

/**
 * Check if the Firebase emulator is running and ready
 */
async function checkEmulatorHealth() {
  try {
    execSync(
      'curl -s http://localhost:5001/nfl-parlay-builder-dev/us-central1/v2/health',
      { stdio: 'pipe' }
    )
    return true
  } catch (error) {
    return false
  }
}

/**
 * Wait for emulator to be ready with retries
 */
async function waitForEmulator(
  initialWaitMs = 15000,
  retryDelay = 2000,
  maxRetries = 30
) {
  console.log('⏳ Waiting for Firebase emulator to be ready...')

  // Initial wait period
  console.log(`⏳ Initial wait period: ${initialWaitMs / 1000}s...`)
  await new Promise(resolve => setTimeout(resolve, initialWaitMs))

  // Check if emulator is ready after initial wait
  if (await checkEmulatorHealth()) {
    console.log('✅ Firebase emulator is ready!')
    return true
  }

  // Start retrying every 2 seconds
  console.log('⏳ Initial wait complete, starting retry attempts...')

  for (let i = 0; i < maxRetries; i++) {
    if (await checkEmulatorHealth()) {
      console.log('✅ Firebase emulator is ready!')
      return true
    }

    if (i < maxRetries - 1) {
      console.log(
        `⏳ Emulator not ready yet, retrying in ${retryDelay / 1000}s... (${i + 1}/${maxRetries})`
      )
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }

  console.log(
    '⚠️  Firebase emulator did not become ready within the timeout period'
  )
  return false
}

/**
 * Start the frontend application
 */
function startFrontend() {
  console.log('🌐 Starting frontend...')
  frontendProcess = spawn('npm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    shell: true,
  })

  frontendProcess.on('error', error => {
    console.error('❌ Failed to start frontend:', error.message)
    process.exit(1)
  })

  frontendProcess.on('exit', code => {
    if (code !== 0) {
      console.log(`Frontend exited with code ${code}`)
    }
  })
}

/**
 * Handle process termination
 */
function setupProcessHandlers() {
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development environment...')
    if (frontendProcess) {
      frontendProcess.kill('SIGINT')
    }
    if (emulatorProcess) {
      emulatorProcess.kill('SIGINT')
    }
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development environment...')
    if (frontendProcess) {
      frontendProcess.kill('SIGTERM')
    }
    if (emulatorProcess) {
      emulatorProcess.kill('SIGTERM')
    }
    process.exit(0)
  })
}

/**
 * Main startup sequence
 */
async function startDevelopmentEnvironment() {
  setupProcessHandlers()

  try {
    // Get the OpenAI API key from Firebase Secret Manager
    console.log('🔑 Loading OpenAI API key...')
    const openaiApiKey = execSync(
      'firebase functions:secrets:access OPENAI_API_KEY',
      {
        encoding: 'utf8',
        stdio: 'pipe',
      }
    ).trim()

    if (openaiApiKey) {
      // Set the environment variable
      process.env.OPENAI_API_KEY = openaiApiKey
      console.log('✅ OpenAI API key loaded successfully')

      // Start the Firebase emulator
      console.log('🚀 Starting Firebase emulator...')
      emulatorProcess = spawn(
        'firebase',
        ['emulators:start', '--only', 'functions'],
        {
          stdio: 'inherit',
          shell: true,
        }
      )

      emulatorProcess.on('error', error => {
        console.log('⚠️  Emulator failed to start:', error.message)
        console.log('📡 Will use deployed functions instead')
        emulatorStartAttempted = true
        startFrontend()
      })

      emulatorProcess.on('exit', code => {
        if (code !== 0) {
          console.log(`⚠️  Emulator exited with code ${code}`)
          console.log('📡 Will use deployed functions instead')
        }
        emulatorStartAttempted = true
      })

      // Wait for emulator to be ready
      emulatorStartAttempted = true
      isEmulatorReady = await waitForEmulator(15000, 2000, 30)

      if (isEmulatorReady) {
        console.log('✅ Using local Firebase functions')
      } else {
        console.log('📡 Using deployed Firebase functions')
      }
    } else {
      console.log('⚠️  No OpenAI API key found')
      console.log('📡 Will use deployed functions instead')
    }
  } catch (error) {
    console.log('⚠️  Error getting OpenAI API key:', error.message)
    console.log('📡 Will use deployed functions instead')
  }

  // Start the frontend after emulator status is determined
  startFrontend()
}

// Start the development environment
startDevelopmentEnvironment()
