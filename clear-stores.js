// Clear corrupted store data from localStorage
// Run this in the browser console to fix the migration error

console.log('🧹 Clearing corrupted store data...')

// Clear all NFL Parlay store data
const keys = Object.keys(localStorage)
const storeKeys = keys.filter(key => key.startsWith('nfl-parlay-'))

console.log(`Found ${storeKeys.length} store entries:`)
storeKeys.forEach(key => {
  console.log(`  - ${key}`)
  localStorage.removeItem(key)
})

console.log('✅ Store data cleared! Refresh the page to see the changes.')

// Alternative: Clear specific stores
// localStorage.removeItem('nfl-parlay-general-store')
// localStorage.removeItem('nfl-parlay-parlay-store')
// localStorage.removeItem('nfl-parlay-auth-store')
// localStorage.removeItem('nfl-parlay-legal-store')
