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
import React, { useState } from 'react'
import { useEntitlements } from '@shared/hooks/useEntitlements'
import { allowanceExhaustedCopy, bindingAllowance } from '@shared/rateLimits'
import { useRateLimit } from '@shared/hooks/useRateLimit'
import { useGamesForWeek } from '@shared/hooks/useSeason'
import useParlayStore from '@shared/store/parlayStore'
import type { Game, RiskLevel } from '../types'
import TeamLogo from './display/TeamLogo'
import ErrorBanner from './ErrorBanner'
import ProGate from './ProGate'
import QuotaIndicator from './QuotaIndicator'
import UpgradeDialog from './UpgradeDialog'
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
  const { rateLimit, getTimeUntilReset } = useRateLimit()
  const selectedGame = useParlayStore(state => state.selectedGame)
  const riskLevel = useParlayStore(state => state.riskLevel)
  const setRiskLevel = useParlayStore(state => state.setRiskLevel)
  const { capabilities, quota, entitlements } = useEntitlements()
  const bookmaker = useParlayStore(state => state.bookmaker)
  const setBookmaker = useParlayStore(state => state.setBookmaker)
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null)

  // Until entitlements load, treat every gated control as locked. Defaulting
  // the other way would flash an unlocked control that then disables itself,
  // and would let a click through in the gap.
  const allowedRisks = capabilities?.riskLevels ?? ['moderate']
  const quotaExhausted = quota?.remaining === 0
  // Whichever window actually ran out, so the banner never says "hourly" about
  // the daily valve. Weekly exhaustion has its own treatment below.
  const exhausted = allowanceExhaustedCopy(bindingAllowance({ quota, rateLimit }))
  const atLimit = !!exhausted
  const canChooseBook = capabilities?.chooseSportsbook ?? false
  const sportsbooks = entitlements?.sportsbooks ?? []
  // Free is structurally three legs (one per market, no props); Pro picks a
  // count. Until that selector exists, show the plan's floor rather than a
  // hardcoded 3, so the label never contradicts what the server will build.
  const legCountLabel = capabilities?.legCount.default ?? 3
  const [, tick] = React.useState(0)

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
                {RISK_LEVELS.map(r =>
                  allowedRisks.includes(r.value) ? (
                    <ToggleButton key={r.value} value={r.value} sx={{ px: 2 }}>
                      {r.label}
                    </ToggleButton>
                  ) : (
                    // Rendered rather than hidden: the upsell lands next to a
                    // parlay the user already likes, not on an empty state.
                    <ProGate
                      key={r.value}
                      locked
                      label={`the ${r.label.toLowerCase()} risk level`}
                      onUpgrade={() =>
                        setUpgradeReason(
                          `The ${r.label.toLowerCase()} risk level is part of Pro.`
                        )
                      }
                    >
                      <ToggleButton value={r.value} disabled sx={{ px: 2 }}>
                        {r.label}
                      </ToggleButton>
                    </ProGate>
                  )
                )}
              </ToggleButtonGroup>
            </Box>

            {sportsbooks.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 3,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Sportsbook
                </Typography>
                <ProGate
                  locked={!canChooseBook}
                  label="your own sportsbook"
                  onUpgrade={() =>
                    setUpgradeReason(
                      'Pricing every leg on your own sportsbook is part of Pro.'
                    )
                  }
                >
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value={canChooseBook ? (bookmaker ?? '') : ''}
                      displayEmpty
                      disabled={!canChooseBook}
                      onChange={(e: SelectChangeEvent<string>) =>
                        setBookmaker(e.target.value || undefined)
                      }
                      inputProps={{ 'aria-label': 'Sportsbook' }}
                    >
                      {/* Empty is a real choice, not a placeholder: it means
                          "whichever book has posted this game". */}
                      <MenuItem value="">Best available</MenuItem>
                      {sportsbooks.map(book => (
                        <MenuItem key={book.key} value={book.key}>
                          {book.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ProGate>
              </Box>
            )}

            {quota && (
              <Box sx={{ mb: 3 }}>
                <QuotaIndicator
                  quota={quota}
                  onUpgrade={() =>
                    setUpgradeReason(
                      quota.remaining === 0
                        ? 'You have used this week\u2019s parlays. Pro removes the limit.'
                        : 'Pro removes the weekly limit.'
                    )
                  }
                />
              </Box>
            )}

            {selectedGame && (
              <Box sx={{ textAlign: 'center' }}>
                {atLimit && (
                  <ErrorBanner
                    type="rate_limit_reached"
                    title={exhausted?.title ?? 'Run limit reached'}
                    message={
                      exhausted?.message ??
                      "You've used all your parlay generations for now."
                    }
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
                {/* An exhausted weekly quota is a different thing from the
                    hourly rate limit: waiting will not clear it before Tuesday,
                    so it offers the upgrade instead of a countdown. */}
                {quotaExhausted && (
                  <ErrorBanner
                    type="rate_limit_reached"
                    title="No parlays left this week"
                    message={`Your next ${quota?.limit ?? 0} arrive Tuesday. Pro removes the limit entirely.`}
                  />
                )}
                <Button
                  variant="contained"
                  size="large"
                  startIcon={atLimit ? <AccessTimeIcon /> : <CasinoIcon />}
                  onClick={
                    quotaExhausted
                      ? () =>
                          setUpgradeReason(
                            'You have used this week\u2019s parlays. Pro removes the limit.'
                          )
                      : onGenerateParlay
                  }
                  disabled={!canGenerate || atLimit}
                  sx={{ px: 4, py: 1.5 }}
                >
                  {quotaExhausted
                    ? 'Upgrade for unlimited parlays'
                    : `Create ${legCountLabel}-leg parlay`}
                </Button>
              </Box>
            )}
          </>
        )}

        <UpgradeDialog
          open={upgradeReason !== null}
          onClose={() => setUpgradeReason(null)}
          canPurchase={entitlements?.billingAvailable.stripe ?? false}
          reason={upgradeReason ?? undefined}
        />
      </CardContent>
    </Card>
  )
}

export default GameSelector
