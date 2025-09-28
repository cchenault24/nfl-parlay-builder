import { Casino as CasinoIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import React from 'react'
import { useParlayGenerator } from '../../hooks/useParlayGenerator'
import type { NFLGame } from '../../types'
import { formatGameDateTime } from '../../utils'
import { useParlayStore } from '../parlay/store/parlayStore'
import WeekSelector from './WeekSelector'

interface GameSelectorProps {
  games: NFLGame[]
  loading: boolean
  onGenerateParlay: () => void
  canGenerate: boolean
  // Week selector props
  currentWeek: number
  onWeekChange: (week: number) => void
  availableWeeks: number[]
  weekLoading?: boolean
}

const GameSelector: React.FC<GameSelectorProps> = ({
  games,
  loading,
  onGenerateParlay,
  canGenerate,
  currentWeek,
  onWeekChange,
  availableWeeks,
  weekLoading = false,
}) => {
  const selectedGame = useParlayStore(state => state.selectedGame)
  const setSelectedGame = useParlayStore(state => state.setSelectedGame)
  const { reset: resetParlay } = useParlayGenerator()

  const handleGameChange = (event: SelectChangeEvent<string>) => {
    const gameId = event.target.value
    const game = games.find(g => g.id === gameId)
    if (game) {
      setSelectedGame(game)
      resetParlay()
    }
  }

  const formatGameDisplay = (game: NFLGame) => {
    return `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`
  }

  // Helper function to check if game is completed
  const isGameCompleted = (game: NFLGame): boolean => {
    // Handle both old simple status and new complex status structure
    if (typeof game.status === 'string') {
      return game.status === 'final'
    } else if (
      game.status &&
      typeof game.status === 'object' &&
      game.status.type
    ) {
      return (
        game.status.type.completed === true ||
        game.status.type.name?.toLowerCase() === 'final' ||
        game.status.type.state === 'post'
      )
    }
    return false
  }

  if (loading && !games.length) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading NFL games...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Select Game
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <WeekSelector
            currentWeek={currentWeek}
            onWeekChange={onWeekChange}
            availableWeeks={availableWeeks}
            loading={weekLoading || loading}
          />

          {games.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {games.length} game{games.length !== 1 ? 's' : ''} available
            </Typography>
          )}
        </Box>

        {games.length === 0 && !loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary">
              No games found for Week {currentWeek}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try selecting a different week
            </Typography>
          </Box>
        ) : (
          <>
            <FormControl fullWidth sx={{ mb: 3 }} disabled={loading}>
              <InputLabel id="game-select-label">Choose NFL Game</InputLabel>
              <Select
                labelId="game-select-label"
                id="game-select"
                value={selectedGame?.id || ''}
                label="Choose NFL Game"
                onChange={handleGameChange}
                native={false}
                variant="outlined"
                MenuProps={{
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                  PaperProps: {
                    style: {
                      maxHeight: '300px',
                      backgroundColor: '#1e1e1e',
                      color: 'white',
                    },
                  },
                  sx: {
                    '& .MuiPaper-root': {
                      zIndex: 1300,
                    },
                    '& .MuiMenuItem-root': {
                      padding: '12px 16px',
                      minHeight: '48px',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    },
                  },
                }}
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
                {games.map(game => {
                  const gameCompleted = isGameCompleted(game)
                  return (
                    <MenuItem
                      key={game.id}
                      value={game.id}
                      disabled={gameCompleted} // Disable completed games
                      sx={{
                        padding: '12px 16px',
                        minHeight: '48px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        opacity: gameCompleted ? 0.6 : 1,
                        '&:hover': {
                          backgroundColor: gameCompleted
                            ? 'transparent'
                            : 'rgba(46, 125, 50, 0.1)',
                        },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(46, 125, 50, 0.2)',
                          '&:hover': {
                            backgroundColor: 'rgba(46, 125, 50, 0.3)',
                          },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          width: '100%',
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 500, flex: 1 }}
                        >
                          {formatGameDisplay(game)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatGameDateTime(game.date)}
                      </Typography>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            {selectedGame && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Selected: <strong>{formatGameDisplay(selectedGame)}</strong>
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CasinoIcon />}
                  onClick={onGenerateParlay}
                  disabled={!canGenerate || loading}
                  sx={{
                    px: 4,
                    py: 1.5,
                    minHeight: '48px',
                  }}
                >
                  {loading ? 'Loading...' : 'Create 3-Leg Parlay'}
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default GameSelector
