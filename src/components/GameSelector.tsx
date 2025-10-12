import {
  AccessTime as AccessTimeIcon,
  Casino as CasinoIcon,
} from '@mui/icons-material'
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
import { useParlayGenerator } from '../hooks/useParlayGenerator'
import { usePFRSchedule } from '../hooks/usePFRSchedule'
import { useRateLimit } from '../hooks/useRateLimit'
import useParlayStore from '../store/parlayStore'
import TeamLogo from './display/TeamLogo'
import ErrorBanner from './ErrorBanner'
import WeekSelector from './WeekSelector'

interface GameSelectorProps {
  onGenerateParlay: () => void
  canGenerate: boolean
  // Week selector props
  currentWeek: number
  onWeekChange: (week: number) => void
  availableWeeks: number[]
  weekLoading?: boolean
}

const GameSelector: React.FC<GameSelectorProps> = ({
  onGenerateParlay,
  canGenerate,
  currentWeek,
  onWeekChange,
  availableWeeks,
  weekLoading = false,
}) => {
  // Use PFR schedule hook and filter by current week
  const { data: allGames, isLoading: loading, error } = usePFRSchedule()

  // Rate limiting hook
  const { rateLimitInfo, isAtLimit, isNearLimit, getTimeUntilReset } =
    useRateLimit()

  const games = allGames?.filter(game => game.week === currentWeek) || []
  const selectedGame = useParlayStore(state => state.selectedGame)
  const setSelectedGame = useParlayStore(state => state.setSelectedGame)
  const { reset: resetParlay } = useParlayGenerator()

  // Reset selected game if it's not in the current week's games
  React.useEffect(() => {
    if (selectedGame && games.length > 0) {
      const gameExists = games.some(game => game.gameId === selectedGame.gameId)
      if (!gameExists) {
        setSelectedGame(null)
        resetParlay()
      }
    }
  }, [selectedGame, games, setSelectedGame, resetParlay])

  const handleGameChange = (event: SelectChangeEvent<string>) => {
    const gameId = event.target.value
    const game = games?.find(g => g.gameId === gameId)
    if (game) {
      setSelectedGame(game)
      resetParlay()
    }
  }

  const formatGameDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading && !games?.length) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading NFL games from PFR...</Typography>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="error" sx={{ mb: 2 }}>
            Error loading games:{' '}
            {error instanceof Error ? error.message : String(error)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please try again or select a different week
          </Typography>
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

          {games && games.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {games.length} game{games.length !== 1 ? 's' : ''} available
            </Typography>
          )}
        </Box>

        {(!games || games.length === 0) && !loading ? (
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
                value={
                  selectedGame &&
                  games.some(game => game.gameId === selectedGame.gameId)
                    ? selectedGame.gameId
                    : ''
                }
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
                {games?.map(game => {
                  return (
                    <MenuItem
                      key={game.gameId}
                      value={game.gameId}
                      disabled={game.status === 'final'} // Disable completed games
                      sx={{
                        padding: '12px 16px',
                        minHeight: '48px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        opacity: game.status === 'final' ? 0.6 : 1,
                        '&:hover': {
                          backgroundColor:
                            game.status === 'final'
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
                          gap: 1,
                          width: '100%',
                          justifyContent: 'flex-start',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexDirection: { xs: 'row', sm: 'row' },
                          }}
                        >
                          <TeamLogo teamName={game.away.name} size="small" />
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {game.away.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              flexShrink: 0,
                            }}
                          >
                            @
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {game.home.name}
                          </Typography>
                          <TeamLogo teamName={game.home.name} size="small" />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatGameDate(game.dateTime)}
                      </Typography>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            {selectedGame && (
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    mb: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mr: { xs: 0, sm: 1 } }}
                  >
                    Selected:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {selectedGame.away.name} @ {selectedGame.home.name}
                  </Typography>
                </Box>

                {/* Rate limit status */}
                {rateLimitInfo && (
                  <>
                    {isAtLimit() && (
                      <ErrorBanner
                        type="rate_limit_reached"
                        title="Rate limit reached"
                        message={`You've used all ${rateLimitInfo.total} parlay generations for this hour.`}
                        countdown={getTimeUntilReset()}
                      />
                    )}
                    {isNearLimit() && !isAtLimit() && (
                      <ErrorBanner
                        type="rate_limit_warning"
                        message="You're approaching your hourly limit"
                        countdown={getTimeUntilReset()}
                      />
                    )}
                  </>
                )}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={isAtLimit() ? <AccessTimeIcon /> : <CasinoIcon />}
                  onClick={onGenerateParlay}
                  disabled={!canGenerate || loading || isAtLimit()}
                  sx={{
                    px: 4,
                    py: 1.5,
                    minHeight: '48px',
                    opacity: isAtLimit() ? 0.6 : 1,
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
