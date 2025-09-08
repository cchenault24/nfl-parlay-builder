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
  // Detect iOS devices
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const handleGameChange = (event: SelectChangeEvent<string>) => {
    const gameId = event.target.value;
    const game = games.find(g => g.id === gameId);
    if (game) {
      onGameSelect(game);
    }
  };

  const formatGameDisplay = (game: NFLGame) => {
    return `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`;
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

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading NFL games...</Typography>
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
            native={isIOS()} // Use native select on iOS
            variant="outlined"
            sx={{
              '& .MuiSelect-select': {
                minHeight: '24px',
                padding: '16.5px 14px',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.4)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#2e7d32',
              },
            }}
          >
            {isIOS() ? (
              // Native options for iOS
              <>
                <option value="" disabled>
                  Choose NFL Game
                </option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {formatGameDisplay(game)} - {formatGameDateTime(game.date)}
                  </option>
                ))}
              </>
            ) : (
              // MUI MenuItems for non-iOS
              games.map((game) => (
                <MenuItem 
                  key={game.id} 
                  value={game.id}
                  sx={{
                    padding: '12px 16px',
                    minHeight: '48px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatGameDisplay(game)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatGameDateTime(game.date)}
                  </Typography>
                </MenuItem>
              ))
            )}
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
              sx={{ 
                px: 4, 
                py: 1.5,
                minHeight: '48px',
              }}
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