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
import { useAvailableWeeks } from './hooks/useAvailableWeek'
import { useCurrentWeek } from './hooks/useCurrentWeek'
import { useGameRosters } from './hooks/useGameRosters'
import { useNFLGames } from './hooks/useNFLGames'
import { useParlayGeneratorSelector } from './hooks/useParlayGeneratorSelector'
import { useRateLimit } from './hooks/useRateLimit'
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

  // Get roster data for the selected game
  const { rosters } = useGameRosters(selectedGame || undefined)

  // Get rate limit info to disable generation when limit reached
  const { isAtLimit } = useRateLimit()

  // Fixed destructuring to match the actual return type of useParlayGeneratorSelector
  const parlayGenerator = useParlayGeneratorSelector()
  const {
    generateParlay,
    isGenerating: parlayLoading, // Use isGenerating instead of isPending
    error: parlayError,
    reset: resetParlay,
  } = parlayGenerator

  // Check age verification status
  useEffect(() => {
    if (!ageLoading && !isVerified) {
      setAgeVerificationOpen(true)
    }
  }, [ageLoading, isVerified])

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    setSelectedGame(null)
    resetParlay()
  }

  const handleGenerateParlay = () => {
    if (selectedGame) {
      // Map NFLGame to the expected game format for ParlayPreferences
      const gameData = {
        homeTeam:
          selectedGame.homeTeam.displayName ||
          selectedGame.homeTeam.name ||
          selectedGame.homeTeam.abbreviation ||
          String(selectedGame.homeTeam),
        awayTeam:
          selectedGame.awayTeam.displayName ||
          selectedGame.awayTeam.name ||
          selectedGame.awayTeam.abbreviation ||
          String(selectedGame.awayTeam),
        gameTime: selectedGame.date,
        venue: 'TBD', // NFLGame doesn't have venue info, so we'll use a placeholder
        week: selectedGame.week, // Include the week information
      }

      // Create the full ParlayPreferences object
      const parlayPreferences: any = {
        game: gameData,
        rosters: rosters || {
          homeRoster: [],
          awayRoster: [],
        },
        strategy: {
          riskLevel: 'moderate',
          targetOdds: 300,
          maxLegs: 4,
          minLegs: 2,
        },
        varietyFactors: {
          includePlayerProps: true,
          includeGameProps: true,
          includeTeamProps: false,
          diversifyPositions: true,
        },
        options: {
          budget: 50,
          excludeInjuredPlayers: true,
          favoriteTeamBias: gameData.homeTeam,
        },
        // Add the gameId at the top level as expected by the service
        gameId: selectedGame.id,
      }

      generateParlay(parlayPreferences)
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

  // Show loading screen while checking authentication or age verification
  if (loading || ageLoading) {
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
            games={games || []}
            loading={gamesLoading || weekLoading}
            onGenerateParlay={handleGenerateParlay}
            canGenerate={!!selectedGame && !parlayLoading && !isAtLimit()}
            currentWeek={selectedWeek}
            onWeekChange={handleWeekChange}
            availableWeeks={availableWeeks}
            weekLoading={weekLoading}
          />

          {/* Show any parlay errors */}
          {parlayError && (
            <Box sx={{ mb: 2 }}>
              <Typography color="error">
                Error: {parlayError.message}
              </Typography>
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
