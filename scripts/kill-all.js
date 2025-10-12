#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const isWindows = process.platform === 'win32'

const processesToKill = [
  'firebase',
  'vite',
  'concurrently',
  'node', // for any node processes running dev scripts
]

async function killProcesses() {
  console.log('🔪 Killing all development processes...\n')

  for (const processName of processesToKill) {
    try {
      if (isWindows) {
        // Windows: Use taskkill
        const { stdout, stderr } = await execAsync(
          `taskkill /f /im "${processName}.exe" /t 2>nul || echo "No ${processName} processes found"`
        )
        if (stdout && !stdout.includes('No') && !stdout.includes('not found')) {
          console.log(`✅ Killed ${processName} processes`)
        }
      } else {
        // macOS/Linux: Use pkill
        const { stdout, stderr } = await execAsync(
          `pkill -f "${processName}" 2>/dev/null || echo "No ${processName} processes found"`
        )
        if (stdout && !stdout.includes('No')) {
          console.log(`✅ Killed ${processName} processes`)
        }
      }
    } catch (error) {
      // Ignore errors - process might not be running
      console.log(`ℹ️  No ${processName} processes found`)
    }
  }

  console.log('\n🎉 All development processes killed!')
  console.log('💡 You can now run "npm run dev" to start fresh')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Goodbye!')
  process.exit(0)
})

killProcesses().catch(console.error)
