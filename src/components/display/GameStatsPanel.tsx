import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import ThermostatIcon from '@mui/icons-material/Thermostat'
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
import useParlayStore from '@shared/store/parlayStore'
import type { OddsSnapshot, RankedStat, TeamStats } from '../../types'
import { formatOdds } from '../../utils'
import MatchupRow from './MatchupRow'
import TeamCard from './TeamCard'
import TeamLogo from './TeamLogo'

type StatPick = (s: TeamStats) => RankedStat

// Names the book the prices actually came from, and says so plainly when it is
// not the one the user picked — the legs are real either way, but showing
// someone else's number under your own book's name would be a lie.
function bookLinesLabel(odds: OddsSnapshot): string {
  if (odds.requestedBookmakerKey) {
    return `Book lines · ${odds.bookmaker} (your book had no line)`
  }
  return `Book lines · ${odds.bookmaker}`
}

const MATCHUP_ROWS: Array<{ label: string; pick: StatPick }> = [
  { label: 'Total yards', pick: s => s.offense.totalYardsPerGame },
  { label: 'Passing yards', pick: s => s.offense.passingYardsPerGame },
  { label: 'Rushing yards', pick: s => s.offense.rushingYardsPerGame },
  { label: 'Points scored', pick: s => s.offense.pointsPerGame },
  { label: 'Yards allowed', pick: s => s.defense.yardsAllowedPerGame },
  { label: 'Points allowed', pick: s => s.defense.pointsAllowedPerGame },
  { label: 'Takeaways', pick: s => s.defense.takeaways },
]

const GameStatsPanel: React.FC = () => {
  const game = useParlayStore(state => state.game)
  const homeStats = useParlayStore(state => state.homeStats)
  const awayStats = useParlayStore(state => state.awayStats)
  const odds = useParlayStore(state => state.odds)
  const parlay = useParlayStore(state => state.parlay)

  if (!game) {
    return null
  }
  const { home, away, venue, weather, dateTime } = game
  const statsSeason = homeStats?.season ?? awayStats?.season
  const priorSeason = statsSeason !== undefined && statsSeason < game.season

  const InfoRow = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 16 } }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  )

  return (
    <Accordion
      data-testid="game-stats-panel"
      variant="outlined"
      disableGutters
      sx={{ mb: 2, '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Game data
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {parlay?.gameContext && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {parlay.gameContext}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <InfoRow
            icon={<AccessTimeIcon />}
            text={`${new Date(dateTime).toLocaleString('en-US', {
              timeZone: 'America/New_York',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })} ET`}
          />
          {venue && (
            <InfoRow
              icon={<LocationOnIcon />}
              text={`${venue.name}, ${venue.city}, ${venue.state}${venue.indoor ? ' (indoor)' : ''}${game.neutralSite ? ' · neutral site' : ''}`}
            />
          )}
          <InfoRow
            icon={<ThermostatIcon />}
            text={
              venue?.indoor
                ? 'Indoor stadium — weather not a factor'
                : weather
                  ? `Forecast at kickoff: ${weather.condition}, ${weather.temperatureF}°F`
                  : 'Forecast not available'
            }
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {odds ? bookLinesLabel(odds) : 'Book lines'}
          </Typography>
          {odds ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Typography variant="body2">
                Spread: {odds.spread ? `${home.abbrev} ${formatOdds(odds.spread.line)} (${formatOdds(odds.spread.homePrice)})` : '—'}
              </Typography>
              <Typography variant="body2">
                Total: {odds.total ? `${odds.total.line} (O ${formatOdds(odds.total.overPrice)} / U ${formatOdds(odds.total.underPrice)})` : '—'}
              </Typography>
              <Typography variant="body2">
                Moneyline: {odds.moneyline ? `${home.abbrev} ${formatOdds(odds.moneyline.home)} / ${away.abbrev} ${formatOdds(odds.moneyline.away)}` : '—'}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not available for this game.
            </Typography>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Matchup rankings
            </Typography>
            {statsSeason !== undefined && (
              <Typography variant="caption" color="text.secondary">
                {statsSeason} season{priorSeason ? ' (no games played yet this year)' : ''}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              px: 1,
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TeamLogo teamName={away.name} size="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {away.abbrev}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              at
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {home.abbrev}
              </Typography>
              <TeamLogo teamName={home.name} size="small" />
            </Box>
          </Box>
          <MatchupRow
            label="Overall"
            homeRank={homeStats?.overallRank}
            awayRank={awayStats?.overallRank}
            index={0}
          />
          {MATCHUP_ROWS.map((row, i) => (
            <MatchupRow
              key={row.label}
              label={row.label}
              homeRank={homeStats ? row.pick(homeStats).rank : undefined}
              awayRank={awayStats ? row.pick(awayStats).rank : undefined}
              index={i + 1}
            />
          ))}
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TeamCard team={away} stats={awayStats} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TeamCard team={home} stats={homeStats} />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  )
}

export default GameStatsPanel
