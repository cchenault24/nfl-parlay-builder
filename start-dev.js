#!/usr/bin/env node

import { execSync, spawn } from 'child_process'

/**
 * Start development environment with fallback to deployed functions
 */

console.log('🚀 Starting development environment...')

// Try to start the emulator in the background
console.log('🔧 Attempting to start Firebase emulator...')

let emulatorProcess = null

try {
  // Get the OpenAI API key from Firebase Secret Manager
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
    console.log('🚀 Starting Firebase emulator...')

    // Start the Firebase emulator
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
    })

    emulatorProcess.on('exit', code => {
      if (code !== 0) {
        console.log('⚠️  Emulator exited with code', code)
        console.log('📡 Will use deployed functions instead')
      }
    })
  } else {
    console.log('⚠️  No OpenAI API key found')
    console.log('📡 Will use deployed functions instead')
  }
} catch (error) {
  console.log('⚠️  Error getting OpenAI API key:', error.message)
  console.log('📡 Will use deployed functions instead')
}

// Wait a bit to see if emulator starts successfully
setTimeout(() => {
  try {
    // Check if emulator is running
    execSync(
      'curl -s http://localhost:5001/nfl-parlay-builder-dev/us-central1/api/v2/health',
      { stdio: 'pipe' }
    )
    console.log('✅ Emulator is running, using local functions')
  } catch (error) {
    console.log('📡 Emulator not available, using deployed functions')
  }

  // Start the frontend regardless
  console.log('🌐 Starting frontend...')
  const frontendProcess = spawn('npm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    shell: true,
  })

  // Handle frontend process
  frontendProcess.on('error', error => {
    console.error('❌ Failed to start frontend:', error.message)
    process.exit(1)
  })

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development environment...')
    frontendProcess.kill('SIGINT')
    if (emulatorProcess) {
      emulatorProcess.kill('SIGINT')
    }
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development environment...')
    frontendProcess.kill('SIGTERM')
    if (emulatorProcess) {
      emulatorProcess.kill('SIGTERM')
    }
    process.exit(0)
  })
}, 5000) // Wait 5 seconds to check emulator status
