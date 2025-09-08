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

  const formatGameDisplay = (game: NFLGame) => {
    return `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`;
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
            // iOS-specific fixes
            native={false}
            variant="outlined"
            MenuProps={{
              // Force the menu to appear properly on iOS
              disablePortal: false,
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              // Add specific styling for mobile
              PaperProps: {
                style: {
                  maxHeight: '300px',
                  backgroundColor: '#1e1e1e', // Match your dark theme
                  color: 'white',
                },
              },
              // Ensure proper z-index
              sx: {
                '& .MuiPaper-root': {
                  zIndex: 1300,
                },
                '& .MuiMenuItem-root': {
                  padding: '12px 16px',
                  minHeight: '48px', // Better touch targets on mobile
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                },
              },
            }}
            sx={{
              // Ensure the select itself works on mobile
              '& .MuiSelect-select': {
                minHeight: '24px',
                padding: '16.5px 14px',
              },
              // Fix for iOS specifically
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
            {games.map((game) => (
              <MenuItem 
                key={game.id} 
                value={game.id}
                sx={{
                  padding: '12px 16px',
                  minHeight: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(46, 125, 50, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(46, 125, 50, 0.3)',
                    },
                  },
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formatGameDisplay(game)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(game.date).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Typography>
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
              sx={{ 
                px: 4, 
                py: 1.5,
                minHeight: '48px', // Better touch target for mobile
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