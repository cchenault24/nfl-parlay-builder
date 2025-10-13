import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material'
import React from 'react'
import useParlayStore from '../../store/parlayStore'
import { GameData } from '../../types'
import MatchupRow from './MatchupRow'
import TeamCard from './TeamCard'
import TeamLogo from './TeamLogo'

export interface GameStatsPanelProps {
  gameData: GameData
  context?: string
  weather?: { condition: string; temperatureF: number; windMph: number }
  isLoading?: boolean
}

const GameStatsPanel: React.FC<GameStatsPanelProps> = ({
  gameData,
  context,
  isLoading = false,
}) => {
  const toolResponses = useParlayStore(state => state.toolResponses)
  const weather = toolResponses?.weather
  const { home, away, venue, dateTime } = gameData
  const offHome = home.stats?.offense?.rankings
  const offAway = away.stats?.offense?.rankings
  const defHome = home.stats?.defense?.rankings
  const defAway = away.stats?.defense?.rankings

  const matchupRows: Array<{
    label: string
    home: number | null | undefined
    away: number | null | undefined
  }> = React.useMemo(() => {
    const offenseKeys: Array<keyof NonNullable<typeof offHome>> = [
      'passingYardsRank',
      'rushingYardsRank',
      'pointsScoredRank',
    ]
    const defenseKeys: Array<keyof NonNullable<typeof defHome>> = [
      'totalYardsAllowedRank',
      'pointsAllowedRank',
      'turnoversRank',
    ]
    const map: Record<string, string> = {
      totalYardsRank: 'Total Yards',
      passingYardsRank: 'Passing Yards',
      rushingYardsRank: 'Rushing Yards',
      pointsScoredRank: 'Points Scored',
      totalYardsAllowedRank: 'Yards Allowed',
      pointsAllowedRank: 'Points Allowed',
      turnoversRank: 'Turnovers',
    }
    const toLabel = (key: string) => map[key] || key

    return [
      {
        label: 'Team Rank',
        home: home.stats?.overallTeamRank,
        away: away.stats?.overallTeamRank,
      },
      ...offenseKeys.map(k => ({
        label: toLabel(k),
        home: offHome?.[k],
        away: offAway?.[k],
      })),
      ...defenseKeys.map(k => ({
        label: toLabel(k),
        home: defHome?.[k],
        away: defAway?.[k],
      })),
    ]
  }, [
    home.stats?.overallTeamRank,
    away.stats?.overallTeamRank,
    offHome,
    offAway,
    defHome,
    defAway,
  ])

  if (isLoading) {
    return (
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Game Statistics
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={60} />
            <Skeleton variant="rectangular" height={200} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="rectangular" height={150} sx={{ flex: 1 }} />
              <Skeleton variant="rectangular" height={150} sx={{ flex: 1 }} />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    )
  }

  return (
    <Accordion
      data-testid="game-stats-panel"
      sx={{
        mb: 2,
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0 0 16px 0',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          '&.Mui-expanded': {
            minHeight: 48,
          },
          '& .MuiAccordionSummary-content': {
            '&.Mui-expanded': {
              margin: '12px 0',
            },
          },
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Game Statistics
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {/* Game info used by AI */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {context && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: 'italic' }}
              >
                {context}
              </Typography>
            )}

            {/* Game Details with Icons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon
                  sx={{ fontSize: 16, color: 'text.secondary' }}
                />
                <Typography variant="body2" color="text.secondary">
                  {new Date(dateTime).toLocaleString('en-US', {
                    timeZone: 'America/New_York',
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}{' '}
                  ET
                </Typography>
              </Box>

              {venue && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon
                    sx={{ fontSize: 16, color: 'text.secondary' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {[venue.name, venue.city, venue.state].join(', ')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
        <Divider sx={{ my: 1.25 }} />

        {/* Weather Display */}
        {weather && (
          <Box sx={{ mb: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                backgroundColor: 'primary.50',
                borderColor: 'primary.200',
              }}
            >
              <Typography
                variant="h6"
                align="center"
                gutterBottom
                sx={{ fontWeight: 700, mb: 1.5 }}
              >
                Weather Conditions
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Chip
                  label={`${weather.temperatureF}°F`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary">
                  {weather.condition}, {weather.windMph} mph winds
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Three-card layout: Matchup, Home, Away */}
        <Grid container spacing={1.5}>
          {/* Matchup Card */}
          <Grid item xs={12}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
              }}
            >
              <Typography
                variant="h6"
                align="center"
                gutterBottom
                sx={{ fontWeight: 700, mb: 2 }}
              >
                Matchup Rankings
              </Typography>

              {/* Header with team names and logos - desktop only */}
              <Box
                sx={{
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  mb: 1,
                  px: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: 'flex-start',
                  }}
                >
                  <TeamLogo teamName={away.name} size="small" />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    {away.name}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.7rem' }}
                >
                  VS
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: 'flex-end',
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    {home.name}
                  </Typography>
                  <TeamLogo teamName={home.name} size="small" />
                </Box>
              </Box>

              {/* Team abbreviations row - mobile only */}
              <Box
                sx={{
                  display: { xs: 'grid', sm: 'none' },
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  px: 1,
                  mb: 2,
                }}
              >
                <Box sx={{ justifySelf: 'start' }}>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    {away.abbrev}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  VS
                </Typography>
                <Box sx={{ justifySelf: 'end' }}>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    {home.abbrev}
                  </Typography>
                </Box>
              </Box>

              {matchupRows.map((r, i) => (
                <MatchupRow
                  key={`${r.label}-matchup-row`}
                  label={r.label}
                  homeRank={r.home}
                  awayRank={r.away}
                  index={i}
                />
              ))}
            </Paper>
          </Grid>
          {/* Away/Home with enhanced @ separator */}
          <Grid container item spacing={1} columns={{ xs: 12, md: 11 }}>
            {/* Away Team Card */}
            <Grid item xs={12} md={5}>
              <TeamCard
                name={away.name}
                record={away.record}
                stats={away.stats || undefined}
              />
            </Grid>

            {/* Center @ separator */}
            <Grid item xs={12} md={1}>
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="h4"
                  color="text.disabled"
                  sx={{ lineHeight: 1, fontWeight: 300 }}
                >
                  @
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.6rem' }}
                >
                  VS
                </Typography>
              </Box>
            </Grid>

            {/* Home Team Card */}
            <Grid item xs={12} md={5}>
              <TeamCard
                name={home.name}
                record={home.record}
                stats={home.stats || undefined}
              />
            </Grid>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  )
}

export default GameStatsPanel
