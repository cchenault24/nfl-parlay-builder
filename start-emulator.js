#!/usr/bin/env node

import { execSync, spawn } from 'child_process'

/**
 * Start Firebase emulator with OpenAI API key from secret
 * This script ensures the emulator has access to the secret
 */

console.log('🔑 Getting OpenAI API key from Firebase Secret Manager...')

try {
  // Get the OpenAI API key from Firebase Secret Manager
  const openaiApiKey = execSync(
    'firebase functions:secrets:access OPENAI_API_KEY',
    {
      encoding: 'utf8',
      stdio: 'pipe',
    }
  ).trim()

  if (!openaiApiKey) {
    console.error('❌ Failed to get OPENAI_API_KEY from secret manager')
    console.error(
      "   Make sure you've set it with: firebase functions:secrets:set OPENAI_API_KEY"
    )
    process.exit(1)
  }

  // Set the environment variable
  process.env.OPENAI_API_KEY = openaiApiKey

  console.log('✅ OpenAI API key loaded successfully')
  console.log('🚀 Starting Firebase emulator...')

  // Start the Firebase emulator
  const emulator = spawn(
    'firebase',
    ['emulators:start', '--only', 'functions'],
    {
      stdio: 'inherit',
      shell: true,
    }
  )

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping Firebase emulator...')
    emulator.kill('SIGINT')
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping Firebase emulator...')
    emulator.kill('SIGTERM')
    process.exit(0)
  })

  // Handle emulator exit
  emulator.on('close', code => {
    if (code !== 0) {
      console.error(`❌ Firebase emulator exited with code ${code}`)
      process.exit(code)
    }
  })

  emulator.on('error', error => {
    console.error('❌ Failed to start Firebase emulator:', error.message)
    process.exit(1)
  })
} catch (error) {
  console.error('❌ Error getting OpenAI API key:', error.message)
  console.error(
    "   Make sure Firebase CLI is installed and you're authenticated"
  )
  console.error('   Run: firebase login')
  process.exit(1)
}
