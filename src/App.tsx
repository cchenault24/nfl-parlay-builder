// src/App.tsx - Updated with error boundary and constants
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { theme } from './theme';
import GameSelector from './components/GameSelector';
import ParlayDisplay from './components/ParlayDisplay';
import ErrorBoundary from './components/ErrorBoundary';
import { useNFLGames } from './hooks/useNFLGames';
import { useParlayGenerator } from './hooks/useParlayGenerator';
import { useState } from 'react';
import { NFLGame } from './types';
import { CACHE_CONFIG } from './config/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_CONFIG.NFL_GAMES_STALE_TIME,
      retry: CACHE_CONFIG.QUERY_RETRY_COUNT,
    },
  },
});

function AppContent() {
  const [selectedGame, setSelectedGame] = useState<NFLGame | null>(null);
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

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          NFL Parlay Builder
        </Typography>
        
        <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
          AI-Powered 3-Leg Parlay Generator
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;