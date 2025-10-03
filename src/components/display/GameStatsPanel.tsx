import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Grid,
  Paper,
  Typography,
} from '@mui/material'
import React from 'react'
import { GameData } from '../../types'
import MatchupRow from './MatchupRow'
import TeamCard from './TeamCard'

export interface GameStatsPanelProps {
  gameData: GameData
  context?: string
  weather?: { condition: string; temperatureF: number; windMph: number }
}

const GameStatsPanel: React.FC<GameStatsPanelProps> = ({
  gameData,
  context,
  weather,
}) => {
  const { home, away, status, venue, week, dateTime } = gameData
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

  return (
    <Accordion sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Game Statistics</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {/* Exact text used in AI prompt (optional transparency) */}
        {context && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {context}
            </Typography>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {/* Game info used by AI */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            Game Info
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Week: {week}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date/Time: {new Date(dateTime).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {status}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Venue: {venue.name}, {venue.city}, {venue.state}
            </Typography>
            {weather ? (
              <Typography variant="body2" color="text.secondary">
                Weather:{' '}
                {weather
                  ? `${weather.condition}, ${weather.temperatureF}°F, ${weather.windMph} mph winds`
                  : 'Not available'}
              </Typography>
            ) : null}
          </Box>
        </Box>
        <Divider sx={{ my: 1.25 }} />

        {/* Three-card layout: Matchup, Home, Away */}
        <Grid container spacing={1.5}>
          {/* Matchup Card */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography
                variant="h6"
                align="center"
                gutterBottom
                sx={{ fontWeight: 700 }}
              >
                Matchup Rankings
              </Typography>
              {/* Header with team names */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {away.name}
                </Typography>
                <Box />
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, textAlign: 'right' }}
                >
                  {home.name}
                </Typography>
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

          {/* Away/Home with compact @ separator */}
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
                }}
              >
                <Typography
                  variant="h4"
                  color="text.disabled"
                  sx={{ lineHeight: 1 }}
                >
                  @
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
