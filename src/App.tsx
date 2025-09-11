import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { theme } from './theme';
import GameSelector from './components/GameSelector';
import ParlayDisplay from './components/ParlayDisplay';
import { useState, useEffect } from 'react';
import { NFLGame } from './types';
import { useAvailableWeeks } from './hooks/useAvailableWeek';
import { useCurrentWeek } from './hooks/useCurrentWeek';
import { useNFLGames } from './hooks/useNFLGames';
import { useParlayGenerator } from './hooks/useParlayGenerator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const [selectedGame, setSelectedGame] = useState<NFLGame | null>(null);
  
  // Get current week from API
  const { currentWeek, isLoading: weekLoading } = useCurrentWeek();
  const { availableWeeks } = useAvailableWeeks();
  
  // Initialize selectedWeek with currentWeek
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek || 1);
  
  // Keep selectedWeek in sync with currentWeek when it changes
  useEffect(() => {
    if (currentWeek && currentWeek !== selectedWeek) {
      setSelectedWeek(currentWeek);
    }
  }, [currentWeek]);
  
  // Always use selectedWeek (which defaults to currentWeek)
  const weekToFetch = selectedWeek;
  const { data: games, isLoading: gamesLoading } = useNFLGames(weekToFetch);
  
  const { mutate: generateParlay, data: generatedParlay, isPending: parlayLoading, reset: resetParlay } = useParlayGenerator();

  const handleGameSelect = (game: NFLGame) => {
    setSelectedGame(game);
    resetParlay();
  };

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setSelectedGame(null);
    resetParlay();
  };

  const handleGenerateParlay = () => {
    if (selectedGame) {
      generateParlay(selectedGame);
    }
  };

  const isLoading = weekLoading || gamesLoading;

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
          loading={isLoading}
          selectedGame={selectedGame}
          onGenerateParlay={handleGenerateParlay}
          canGenerate={!!selectedGame && !parlayLoading}
          // Week selector props
          currentWeek={selectedWeek} // Use selectedWeek as the display week
          onWeekChange={handleWeekChange}
          availableWeeks={availableWeeks}
          weekLoading={weekLoading}
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
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;