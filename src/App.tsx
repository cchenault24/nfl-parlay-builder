import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { theme } from './theme'
import GameSelector from './components/GameSelector'
import ParlayDisplay from './components/display/ParlayDisplay'
import { useState, useEffect } from 'react'
import { useAvailableWeeks } from './hooks/useAvailableWeek'
import { useCurrentWeek } from './hooks/useCurrentWeek'
import { useNFLGames } from './hooks/useNFLGames'
import { useParlayGenerator } from './hooks/useParlayGenerator'
import ParlAIdLogo from './components/ParlAIdLogo'
import { AppBar, Toolbar } from '@mui/material'
import { UserMenu } from './components/auth/UserMenu'
import { AuthGate } from './components/auth/AuthGate'
import { LoadingScreen } from './components/LoadingScreen'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ParlayHistory } from './components/ParlayHistory'
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

  const {
    mutate: generateParlay,
    isPending: parlayLoading,
    reset: resetParlay,
  } = useParlayGenerator()

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    setSelectedGame(null)
    resetParlay()
  }

  const handleGenerateParlay = () => {
    if (selectedGame) {
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

        {/* ParlayDisplay now gets parlay from store automatically */}
        <ParlayDisplay parlay={parlay || undefined} loading={parlayLoading} />

        <ParlayHistory
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      </Container>
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
