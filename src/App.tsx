import { AppBar, Box, Container, CssBaseline, Toolbar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useDerivedCurrentWeek } from '@shared/hooks/useDerivedCurrentWeek'
import { useSeasonSummary } from '@shared/hooks/useSeason'
import useParlayStore from '@shared/store/parlayStore'
import { AuthGate } from './components/auth/AuthGate'
import { UserMenu } from './components/auth/UserMenu'
import DevStatus from './components/DevStatus'
import GameStatsPanel from './components/display/GameStatsPanel'
import ParlayDisplay from './components/display/ParlayDisplay'
import SharedParlayView from './components/display/SharedParlayView'
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
import { useParlayService } from './hooks/useParlayService'
import { theme } from './theme'
import type { Game } from './types'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
})

function AppContent() {
  const selectedGame = useParlayStore(state => state.selectedGame)
  const setSelectedGame = useParlayStore(state => state.setSelectedGame)
  const parlay = useParlayStore(state => state.parlay)

  const { user, loading } = useAuth()
  const [historyOpen, setHistoryOpen] = useState(false)
  const { isVerified, isLoading: ageLoading, setVerified } = useAgeVerification()
  const [showResponsibleGambling, setShowResponsibleGambling] = useState(false)

  const { currentWeek, isLoading: currentWeekLoading } = useDerivedCurrentWeek()
  const { data: seasonSummary, isLoading: seasonLoading } = useSeasonSummary()
  const availableWeeks = seasonSummary?.weeks.map(w => w.week) ?? []

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const activeWeek = selectedWeek ?? currentWeek

  const { generate, isPending, error, reset, cancel, usingMock } = useParlayService()

  const handleGameChange = useCallback(
    (game: Game | null) => {
      setSelectedGame(game)
      reset()
    },
    [setSelectedGame, reset]
  )

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    handleGameChange(null)
  }

  const handleGenerateParlay = () => {
    if (selectedGame) {
      generate({ game: selectedGame })
    }
  }

  const handleAgeDeclined = () => {
    window.location.href = 'https://www.ncpgambling.org/'
  }

  if (loading || ageLoading || currentWeekLoading) {
    return <LoadingScreen />
  }

  if (!isVerified) {
    return (
      <AgeVerificationModal open onVerified={setVerified} onDeclined={handleAgeDeclined} />
    )
  }

  if (showResponsibleGambling) {
    return <ResponsibleGambling onBack={() => setShowResponsibleGambling(false)} />
  }

  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1 }}>
          <AuthGate />
        </Box>
        <LegalFooter onResponsibleGamblingClick={() => setShowResponsibleGambling(true)} />
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1 }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 4 }}>
          <Toolbar sx={{ py: 1.5 }}>
            <Box sx={{ flexGrow: 1 }}>
              <ParlAIdLogo height={{ xs: 44, sm: 60 }} />
            </Box>
            <UserMenu onViewHistory={() => setHistoryOpen(true)} />
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ pb: 6 }}>
          <GameSelector
            onGenerateParlay={handleGenerateParlay}
            onGameChange={handleGameChange}
            canGenerate={!!selectedGame && !isPending}
            currentWeek={activeWeek}
            onWeekChange={handleWeekChange}
            availableWeeks={availableWeeks}
            weekLoading={seasonLoading}
            parlayError={error}
          />

          {parlay && !isPending && <GameStatsPanel />}

          <ParlayDisplay loading={isPending} isMockMode={usingMock} onCancel={cancel} />

          <ParlayHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
        </Container>

        <DevStatus />
      </Box>

      <LegalFooter onResponsibleGamblingClick={() => setShowResponsibleGambling(true)} />
    </Box>
  )
}

// A shared link is public, so it skips sign-in — but not the age gate. The
// page shows betting selections either way, and who sent the link has no
// bearing on who is allowed to look at them.
function SharedRoute() {
  const { isVerified, isLoading, setVerified } = useAgeVerification()
  if (isLoading) {
    return <LoadingScreen />
  }
  if (!isVerified) {
    return (
      <AgeVerificationModal
        open
        onVerified={setVerified}
        onDeclined={() => window.location.assign('https://www.google.com')}
      />
    )
  }
  return <SharedParlayView />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/p/:shareId" element={<SharedRoute />} />
              <Route path="*" element={<AppContent />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
