// src/App.tsx
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import ParlayDisplay from './components/display/ParlayDisplay'
import GameSelector from './components/GameSelector'
import { useAvailableWeeks } from './hooks/useAvailableWeek'
import { useCurrentWeek } from './hooks/useCurrentWeek'
import { useNFLGames } from './hooks/useNFLGames'
import { theme } from './theme'
// Replace this import with the selector
import { AppBar, Toolbar } from '@mui/material'
import { AuthGate } from './components/auth/AuthGate'
import { UserMenu } from './components/auth/UserMenu'
import DevStatus from './components/DevStatus' // Add this import
import { LoadingScreen } from './components/LoadingScreen'
import ParlAIdLogo from './components/ParlAIdLogo'
import { ParlayHistory } from './components/ParlayHistory'
import RateLimitIndicator from './components/RateLimitIndicator' // ADD THIS
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useRateLimit } from './hooks/useRateLimit' // ADD THIS

import { useParlayGeneratorSelector } from './hooks/useParlayGeneratorSelector'
import useParlayStore from './store/parlayStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function AppContent() {
  const selectedGame = useParlayStore(state => state.selectedGame)
  const setSelectedGame = useParlayStore(state => state.setSelectedGame)
  const parlay = useParlayStore(state => state.parlay)

  const { user, loading } = useAuth()
  const [historyOpen, setHistoryOpen] = useState(false)

  const {
    rateLimitInfo,
    isLoading: rateLimitLoading,
    error: rateLimitError,
  } = useRateLimit()

  // Get current week from API
  const { currentWeek, isLoading: weekLoading } = useCurrentWeek()
  const { availableWeeks } = useAvailableWeeks()

  // Initialize selectedWeek with currentWeek
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek || 1)

  // Keep selectedWeek in sync with currentWeek when it changes
  useEffect(() => {
    if (currentWeek && currentWeek !== selectedWeek) {
      setSelectedWeek(currentWeek)
    }
  }, [currentWeek])

  // Always use selectedWeek (which defaults to currentWeek)
  const weekToFetch = selectedWeek
  const { data: games, isLoading: gamesLoading } = useNFLGames(weekToFetch)

  // Only this line changes! Everything else stays the same
  const {
    mutate: generateParlay,
    isPending: parlayLoading,
    error: parlayError,
    reset: resetParlay,
    serviceStatus,
  } = useParlayGeneratorSelector()

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    setSelectedGame(null)
    resetParlay()
  }

  const handleGenerateParlay = () => {
    if (selectedGame) {
      console.log('🔧 Service Status:', serviceStatus)
      generateParlay(selectedGame)
    }
  }

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />
  }

  // Show authentication gate if not authenticated
  if (!user) {
    return <AuthGate />
  }

  return (
    <>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <ParlAIdLogo variant="h6" showIcon={true} size="small" />
          </Box>
          <UserMenu onViewHistory={() => setHistoryOpen(true)} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          NFL Parlay Builder
        </Typography>
        <RateLimitIndicator
          rateLimitInfo={rateLimitInfo}
          isLoading={rateLimitLoading}
          error={rateLimitError}
        />
        <GameSelector
          games={games || []}
          loading={gamesLoading || weekLoading}
          onGenerateParlay={handleGenerateParlay}
          canGenerate={!!selectedGame && !parlayLoading}
          currentWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          availableWeeks={availableWeeks}
          weekLoading={weekLoading}
        />

        {/* Show any parlay errors */}
        {parlayError && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error">Error: {parlayError.message}</Typography>
          </Box>
        )}

        {/* ParlayDisplay gets parlay from store */}
        <ParlayDisplay parlay={parlay || undefined} loading={parlayLoading} />

        <ParlayHistory
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      </Container>

      {/* Add the dev status component */}
      <DevStatus />
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
