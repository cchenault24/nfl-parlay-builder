import {
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'
import { useDerivedCurrentWeek } from '../hooks/useDerivedCurrentWeek'
import { useSeason } from '../hooks/useSchedule'

interface WeekSelectorProps {
  currentWeek: number
  onWeekChange: (week: number) => void
  availableWeeks: number[]
  loading?: boolean
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
  currentWeek,
  onWeekChange,
  availableWeeks,
  loading = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { currentWeek: liveWeek } = useDerivedCurrentWeek()
  const season = useSeason()
  const open = Boolean(anchorEl)

  const statusOf = (week: number): 'past' | 'current' | 'upcoming' =>
    week < liveWeek ? 'past' : week === liveWeek ? 'current' : 'upcoming'

  const statusChip = (week: number) => {
    const status = statusOf(week)
    if (status === 'past') {
      return <Chip label="Completed" size="small" variant="outlined" sx={{ height: 20 }} />
    }
    if (status === 'current') {
      return <Chip label="This week" size="small" color="warning" sx={{ height: 20 }} />
    }
    return <Chip label="Upcoming" size="small" color="primary" variant="outlined" sx={{ height: 20 }} />
  }

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        onClick={e => !loading && setAnchorEl(e.currentTarget)}
        endIcon={
          <ExpandMoreIcon
            sx={{
              transition: 'transform 150ms ease',
              transform: open ? 'rotate(180deg)' : 'none',
            }}
          />
        }
        sx={{
          px: 2,
          py: 1,
          textAlign: 'left',
          borderColor: 'divider',
          '&:hover': { borderColor: 'text.secondary', backgroundColor: 'action.hover' },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', mr: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Week {currentWeek}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {season ? `${season} season` : loading ? 'Loading…' : 'Regular season'}
          </Typography>
        </Box>
        {statusChip(currentWeek)}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ variant: 'outlined', elevation: 0, sx: { maxHeight: 420, width: 280, mt: 1 } }}
        MenuListProps={{ sx: { py: 0 } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Select week
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Week {liveWeek} is current · past weeks are locked
          </Typography>
        </Box>
        {availableWeeks.map(week => {
          const isPast = statusOf(week) === 'past'
          const isSelected = week === currentWeek
          return (
            <MenuItem
              key={week}
              disabled={isPast}
              selected={isSelected}
              onClick={() => {
                onWeekChange(week)
                setAnchorEl(null)
              }}
              sx={{ py: 1.25 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {isPast ? (
                  <LockIcon sx={{ fontSize: 16 }} />
                ) : isSelected ? (
                  <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                ) : null}
              </ListItemIcon>
              <ListItemText
                primary={`Week ${week}`}
                primaryTypographyProps={{ fontWeight: isSelected ? 600 : 400 }}
              />
              {statusChip(week)}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export default WeekSelector
