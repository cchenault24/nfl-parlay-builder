import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
  Paper,
  Fade,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  Check as CheckIcon,
  SportsFootball as FootballIcon,
} from '@mui/icons-material';

interface WeekSelectorProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
  availableWeeks?: number[];
  loading?: boolean;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
  currentWeek,
  onWeekChange,
  availableWeeks = Array.from({ length: 18 }, (_, i) => i + 1),
  loading = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!loading) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleWeekSelect = (week: number) => {
    onWeekChange(week);
    handleClose();
  };

  const getWeekLabel = (week: number) => {
    return `Week ${week}`;
  };

  const getWeekDescription = (week: number) => {
    if (week >= 1 && week <= 18) {
      return 'Regular Season';
    } else if (week === 19) {
      return 'Wild Card';
    } else if (week === 20) {
      return 'Divisional';
    } else if (week === 21) {
      return 'Conference Championship';
    } else if (week === 22) {
      return 'Super Bowl';
    }
    return 'Season';
  };

  return (
    <>
      <Paper
        elevation={0}
        onClick={handleClick}
        sx={{
          position: 'relative',
          cursor: loading ? 'default' : 'pointer',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          borderRadius: 3,
          overflow: 'hidden',
          minWidth: 180,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 20px rgba(46, 125, 50, 0.3)',
          border: `2px solid ${theme.palette.primary.light}`,
          '&:hover': {
            transform: loading ? 'none' : 'translateY(-2px) scale(1.02)',
            boxShadow: '0 8px 30px rgba(46, 125, 50, 0.4)',
            '& .expand-icon': {
              transform: 'rotate(180deg)',
            },
          },
          '&:active': {
            transform: loading ? 'none' : 'translateY(0px) scale(0.98)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover::before': {
            opacity: 1,
          },
        }}
      >
        {/* NFL Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            left: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 1,
            px: 1,
            py: 0.25,
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.65rem', 
              fontWeight: 700,
              color: 'white',
              letterSpacing: '0.5px',
            }}
          >
            NFL
          </Typography>
        </Box>

        {/* Main Content */}
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 2, pt: 1 }}>
          <FootballIcon 
            sx={{ 
              fontSize: 24, 
              color: 'white',
              mr: 1.5,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }} 
          />
          
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'white',
                lineHeight: 1.2,
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {getWeekLabel(currentWeek)}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              {getWeekDescription(currentWeek)}
            </Typography>
          </Box>

          <ExpandMoreIcon 
            className="expand-icon"
            sx={{ 
              fontSize: 24,
              color: 'white',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }} 
          />
        </Box>

        {/* Loading overlay */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
              Loading...
            </Typography>
          </Box>
        )}
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        TransitionComponent={Fade}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            maxHeight: 420,
            width: 240,
            mt: 1,
            backgroundColor: '#1a1a1a',
            backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            border: '1px solid rgba(46, 125, 50, 0.3)',
            borderRadius: 2,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden',
          },
        }}
        MenuListProps={{
          sx: { py: 0 }
        }}
      >
        {/* Menu Header */}
        <Box 
          sx={{ 
            px: 3, 
            py: 2, 
            borderBottom: '1px solid rgba(46, 125, 50, 0.2)',
            background: 'linear-gradient(90deg, rgba(46, 125, 50, 0.1) 0%, rgba(46, 125, 50, 0.05) 100%)',
          }}
        >
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 700, 
              color: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <CalendarIcon sx={{ fontSize: 18 }} />
            Select NFL Week
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              opacity: 0.8,
            }}
          >
            2024-25 Season
          </Typography>
        </Box>
        
        {/* Week Options */}
        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {availableWeeks.map((week) => (
            <MenuItem
              key={week}
              onClick={() => handleWeekSelect(week)}
              selected={week === currentWeek}
              sx={{
                minHeight: 52,
                px: 3,
                py: 1.5,
                position: 'relative',
                '&:hover': {
                  backgroundColor: 'rgba(46, 125, 50, 0.1)',
                  '&::before': {
                    opacity: 1,
                  },
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(46, 125, 50, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.25)',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    backgroundColor: theme.palette.primary.main,
                  },
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, rgba(46, 125, 50, 0.05) 0%, transparent 100%)',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {week === currentWeek ? (
                  <CheckIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                ) : (
                  <FootballIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }} />
                )}
              </ListItemIcon>
              <ListItemText>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: week === currentWeek ? 700 : 500,
                    color: week === currentWeek ? theme.palette.primary.main : 'text.primary',
                  }}
                >
                  {getWeekLabel(week)}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                  }}
                >
                  {getWeekDescription(week)}
                </Typography>
              </ListItemText>
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </>
  );
};

export default WeekSelector;