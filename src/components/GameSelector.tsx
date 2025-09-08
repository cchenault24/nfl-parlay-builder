import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  CircularProgress,
  Chip,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Casino as CasinoIcon } from '@mui/icons-material';
import type { NFLGame } from '../types/nfl';

interface GameSelectorProps {
  games: NFLGame[];
  onGameSelect: (game: NFLGame) => void;
  loading: boolean;
  selectedGame: NFLGame | null;
  onGenerateParlay: () => void;
  canGenerate: boolean;
}

const GameSelector: React.FC<GameSelectorProps> = ({
  games,
  onGameSelect,
  loading,
  selectedGame,
  onGenerateParlay,
  canGenerate,
}) => {
  const handleGameChange = (event: SelectChangeEvent<string>) => {
    const gameId = event.target.value;
    const game = games.find(g => g.id === gameId);
    if (game) {
      onGameSelect(game);
    }
  };

  const formatGameDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatGameDisplay = (game: NFLGame) => {
    return `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`;
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Select Game
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Chip 
            label={`Week ${games[0]?.week || 'Current'} Games`} 
            color="primary" 
            size="small"
            sx={{ mb: 2 }}
          />
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="game-select-label">Choose NFL Game</InputLabel>
          <Select
            labelId="game-select-label"
            id="game-select"
            value={selectedGame?.id || ''}
            label="Choose NFL Game"
            onChange={handleGameChange}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                  zIndex: 1300, // Ensures menu appears above other elements
                },
              },
              anchorOrigin: {
                vertical: "bottom",
                horizontal: "left",
              },
              transformOrigin: {
                vertical: "top",
                horizontal: "left",
              },
            }}
          >
            {games.map((game) => (
              <MenuItem key={game.id} value={game.id}>
                <Box>
                  <Typography variant="body1">
                    {formatGameDisplay(game)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatGameDateTime(game.date)}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedGame && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selected: <strong>{formatGameDisplay(selectedGame)}</strong>
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<CasinoIcon />}
              onClick={onGenerateParlay}
              disabled={!canGenerate}
              sx={{ px: 4, py: 1.5 }}
            >
              Create 3-Leg Parlay
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GameSelector;