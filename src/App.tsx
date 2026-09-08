import { AppBar, Toolbar } from '@mui/material'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
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
import { useSchedule } from './hooks/useSchedule'
import useParlayStore from './store/parlayStore'
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
  const { data: allGames, isLoading: gamesLoading } = useSchedule()
  const availableWeeks = allGames
    ? Array.from(new Set(allGames.map(g => g.week))).sort((a, b) => a - b)
    : []

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
      generate({ game: selectedGame, useMock: usingMock })
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
            weekLoading={gamesLoading}
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
