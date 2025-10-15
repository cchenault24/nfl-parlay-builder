import { AppBar, Toolbar } from '@mui/material'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AuthGate } from './components/auth/AuthGate'
import { UserMenu } from './components/auth/UserMenu'
import DevStatus from './components/DevStatus'
import GameStatsPanel from './components/display/GameStatsPanel'
import ParlayDisplay from './components/display/ParlayDisplay'
import GameSelector from './components/GameSelector'
import { AgeVerificationModal } from './components/legal/AgeVerificationModal'
import { LegalFooter } from './components/legal/LegalFooter'
import { ResponsibleGambling } from './components/legal/ResponsibleGambling'
import { LoadingScreen } from './components/LoadingScreen'
import ParlAIdLogo from './components/ParlAIdLogo'
import { ParlayHistory } from './components/ParlayHistory'
import AuthProvider from './contexts/authentication/AuthContext'
import { useAgeVerification } from './hooks/useAgeVerification'
import { useAuth } from './hooks/useAuth'
import { useDerivedCurrentWeek } from './hooks/useDerivedCurrentWeek'
import { useParlayService } from './hooks/useParlayService'
import { usePFRSchedule } from './hooks/usePFRSchedule'
import useParlayStore from './store/parlayStore'
import { theme } from './theme'

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
  const gameData = useParlayStore(state => state.gameData)

  const { user, loading } = useAuth()
  const [historyOpen, setHistoryOpen] = useState(false)

  // Legal compliance state
  const {
    isVerified,
    isLoading: ageLoading,
    setVerified,
  } = useAgeVerification()
  const [showResponsibleGambling, setShowResponsibleGambling] = useState(false)
  const [ageVerificationOpen, setAgeVerificationOpen] = useState(false)

  // Get current week derived from PFR game data
  const { currentWeek, isLoading: currentWeekLoading } = useDerivedCurrentWeek()

  // Use PFR schedule for all games (for week selection)
  const { data: allGames, isLoading: gamesLoading } = usePFRSchedule()

  // Derive available weeks from PFR schedule
  const availableWeeks = allGames
    ? Array.from(new Set(allGames.map(game => game.week))).sort((a, b) => a - b)
    : []

  // Simple state management - start with currentWeek when available
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek || 1)
  const [userSelectedWeek, setUserSelectedWeek] = useState<number | null>(null)

  // Update selectedWeek when currentWeek changes (but only if user hasn't manually selected a different week)
  useEffect(() => {
    if (currentWeek && !userSelectedWeek) {
      setSelectedWeek(currentWeek)
    }
  }, [currentWeek, userSelectedWeek])

  // No longer need separate gamesWithStats hook - gameData comes with parlay response

  const {
    mutate: generateParlay,
    isPending: parlayLoading,
    error: parlayError,
    reset: resetParlay,
    serviceStatus,
  } = useParlayService()

  // Check age verification status
  useEffect(() => {
    if (!ageLoading && !isVerified) {
      setAgeVerificationOpen(true)
    }
  }, [ageLoading, isVerified])

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    setUserSelectedWeek(week) // Track that user manually selected this week
    setSelectedGame(null)
    resetParlay()
  }

  const handleGenerateParlay = () => {
    if (selectedGame) {
      generateParlay({
        game: selectedGame,
        shouldUseMock: serviceStatus.usingMock,
      })
    }
  }

  const handleAgeVerified = () => {
    setVerified()
    setAgeVerificationOpen(false)
  }

  const handleAgeDeclined = () => {
    alert(
      'You must be 18 or older to use this service. You will be redirected away from this site.'
    )
    window.location.href = 'https://www.google.com'
  }

  const handleResponsibleGamblingClick = () => {
    setShowResponsibleGambling(true)
  }

  const handleBackFromResponsibleGambling = () => {
    setShowResponsibleGambling(false)
  }

  // Show loading screen while checking authentication, age verification, or determining current week
  if (loading || ageLoading || currentWeekLoading) {
    return <LoadingScreen />
  }

  // Show age verification modal if not verified (this blocks everything else)
  if (!isVerified) {
    return (
      <AgeVerificationModal
        open={ageVerificationOpen}
        onVerified={handleAgeVerified}
        onDeclined={handleAgeDeclined}
      />
    )
  }

  // Show responsible gambling page
  if (showResponsibleGambling) {
    return <ResponsibleGambling onBack={handleBackFromResponsibleGambling} />
  }

  // Show authentication gate if not authenticated
  if (!user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <AuthGate />
        </Box>
        <LegalFooter
          onResponsibleGamblingClick={handleResponsibleGamblingClick}
        />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main Content Area */}
      <Box sx={{ flex: 1 }}>
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
            onGenerateParlay={handleGenerateParlay}
            canGenerate={!!selectedGame && !parlayLoading}
            currentWeek={selectedWeek}
            onWeekChange={handleWeekChange}
            availableWeeks={availableWeeks}
            weekLoading={gamesLoading}
            parlayError={parlayError}
          />

          {/* Stats panel for selected game */}
          {selectedGame && gameData && parlay && !parlayLoading && (
            <GameStatsPanel gameData={gameData} context={parlay.gameContext} />
          )}

          {/* ParlayDisplay gets parlay from store */}
          <ParlayDisplay
            parlay={parlay || undefined}
            loading={parlayLoading}
            isMockMode={serviceStatus.usingMock}
          />

          <ParlayHistory
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
          />
        </Container>

        {/* Add the dev status component */}
        <DevStatus />
      </Box>

      {/* Footer - Fixed to bottom of content, not overlapping */}
      <LegalFooter
        onResponsibleGamblingClick={handleResponsibleGamblingClick}
      />
    </Box>
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
