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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import React from 'react'
import { useRateLimit } from '@shared/hooks/useRateLimit'
import { useGamesForWeek } from '@shared/hooks/useSeason'
import useParlayStore from '@shared/store/parlayStore'
import type { Game, RiskLevel } from '../types'
import TeamLogo from './display/TeamLogo'
import ErrorBanner from './ErrorBanner'
import WeekSelector from './WeekSelector'

interface GameSelectorProps {
  onGenerateParlay: () => void
  onGameChange: (game: Game | null) => void
  canGenerate: boolean
  currentWeek: number
  onWeekChange: (week: number) => void
  availableWeeks: number[]
  weekLoading?: boolean
  parlayError?: Error | null
}

const RISK_LEVELS: Array<{ value: RiskLevel; label: string }> = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
]

const formatGameDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const GameSelector: React.FC<GameSelectorProps> = ({
  onGenerateParlay,
  onGameChange,
  canGenerate,
  currentWeek,
  onWeekChange,
  availableWeeks,
  weekLoading = false,
  parlayError,
}) => {
  const { data: games, isLoading: loading, error } = useGamesForWeek(currentWeek)
  const { rateLimitInfo, isAtLimit, getTimeUntilReset } = useRateLimit()
  const selectedGame = useParlayStore(state => state.selectedGame)
  const riskLevel = useParlayStore(state => state.riskLevel)
  const setRiskLevel = useParlayStore(state => state.setRiskLevel)
  const [, tick] = React.useState(0)

  const atLimit = isAtLimit()
  React.useEffect(() => {
    if (!atLimit) {
      return
    }
    const id = setInterval(() => tick(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [atLimit])

  React.useEffect(() => {
    // Only clear the selection if it vanished from the week we're actually
    // showing. If `currentWeek` itself ticked over in the background (the
    // derived "current week" advancing as games go final), `games` is now a
    // different week's list and won't contain the old selection either —
    // that's not a reason to drop what the user is looking at.
    if (
      selectedGame &&
      games &&
      selectedGame.week === currentWeek &&
      !games.some(g => g.gameId === selectedGame.gameId)
    ) {
      onGameChange(null)
    }
  }, [selectedGame, games, currentWeek, onGameChange])

  const handleGameChange = (event: SelectChangeEvent<string>) => {
    onGameChange(games?.find(g => g.gameId === event.target.value) ?? null)
  }

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Select a game
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <WeekSelector
            currentWeek={currentWeek}
            onWeekChange={onWeekChange}
            availableWeeks={availableWeeks}
            loading={weekLoading || loading}
          />
          {games && games.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {games.length} game{games.length === 1 ? '' : 's'}
            </Typography>
          )}
        </Box>

        {loading && !games ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading Week {currentWeek} games…</Typography>
          </Box>
        ) : error ? (
          <ErrorBanner
            type="error"
            title="Couldn't load games"
            message={`${error.message}. Try again or pick a different week.`}
          />
        ) : !games || games.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No games found for Week {currentWeek}.
          </Typography>
        ) : (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="game-select-label">Game</InputLabel>
              <Select
                labelId="game-select-label"
                id="game-select"
                value={selectedGame?.gameId ?? ''}
                label="Game"
                onChange={handleGameChange}
                MenuProps={{ PaperProps: { style: { maxHeight: 360 } } }}
              >
                {games.map(game => {
                  const closed = game.status !== 'scheduled'
                  return (
                    <MenuItem
                      key={game.gameId}
                      value={game.gameId}
                      disabled={closed}
                      sx={{ display: 'block', py: 1.25 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <TeamLogo teamName={game.away.name} size="small" />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {game.away.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          at
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {game.home.name}
                        </Typography>
                        <TeamLogo teamName={game.home.name} size="small" />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatGameDate(game.dateTime)}
                        {closed ? ` · ${game.status.replace('_', ' ')}` : ''}
                      </Typography>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Risk
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={riskLevel}
                onChange={(_e, value: RiskLevel | null) => value && setRiskLevel(value)}
                aria-label="Risk level"
              >
                {RISK_LEVELS.map(r => (
                  <ToggleButton key={r.value} value={r.value} sx={{ px: 2 }}>
                    {r.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {selectedGame && (
              <Box sx={{ textAlign: 'center' }}>
                {atLimit && (
                  <ErrorBanner
                    type="rate_limit_reached"
                    title="Hourly limit reached"
                    message={`You've used all ${rateLimitInfo?.total ?? 0} parlay generations for this hour.`}
                    countdown={getTimeUntilReset()}
                  />
                )}
                {parlayError && (
                  <ErrorBanner
                    type="error"
                    title="Parlay generation failed"
                    message={parlayError.message}
                  />
                )}
                <Button
                  variant="contained"
                  size="large"
                  startIcon={atLimit ? <AccessTimeIcon /> : <CasinoIcon />}
                  onClick={onGenerateParlay}
                  disabled={!canGenerate || atLimit}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Create 3-leg parlay
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
