import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { theme } from './theme';
import GameSelector from './components/GameSelector';
import ParlayDisplay from './components/ParlayDisplay';
import { UserMenu } from './components/auth/UserMenu';
import { ParlayHistory } from './components/ParlayHistory';
import { AuthGate } from './components/auth/AuthGate';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useNFLGames } from './hooks/useNFLGames';
import { useParlayGenerator } from './hooks/useParlayGenerator';
import { NFLGame } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AppContent() {
  const { user, loading } = useAuth();
  const [selectedGame, setSelectedGame] = useState<NFLGame | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: games, isLoading: gamesLoading } = useNFLGames();
  const { mutate: generateParlay, data: generatedParlay, isPending: parlayLoading } = useParlayGenerator();

  const handleGameSelect = (game: NFLGame) => {
    setSelectedGame(game);
  };

  const handleGenerateParlay = () => {
    if (selectedGame) {
      generateParlay(selectedGame);
    }
  };

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Show authentication gate if user is not signed in
  if (!user) {
    return <AuthGate />;
  }

  // Show main app for authenticated users
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              NFL Parlay Builder
            </Typography>
          </Box>
          <UserMenu onViewHistory={() => setHistoryOpen(true)} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            AI-Powered Parlay Generator
          </Typography>
          
          <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Get intelligent 3-leg parlays for NFL games
          </Typography>

          <GameSelector
            games={games || []}
            onGameSelect={handleGameSelect}
            loading={gamesLoading}
            selectedGame={selectedGame}
            onGenerateParlay={handleGenerateParlay}
            canGenerate={!!selectedGame && !parlayLoading}
          />

          <ParlayDisplay
            parlay={generatedParlay}
            loading={parlayLoading}
          />
        </Box>
      </Container>

      {/* Parlay History Modal */}
      <ParlayHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </Box>
  );
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
  );
}

export default App;