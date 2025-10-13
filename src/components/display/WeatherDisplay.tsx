import {
  Air as AirIcon,
  Cloud as CloudIcon,
  Thermostat as ThermostatIcon,
} from '@mui/icons-material'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import React from 'react'

interface WeatherDisplayProps {
  weather: {
    condition: string
    temperatureF: number
    windMph: number
  }
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))

  // Log weather data for debugging
  React.useEffect(() => {
    console.info('🌤️ [WeatherDisplay] Rendering weather data:', {
      condition: weather.condition,
      temperatureF: weather.temperatureF,
      windMph: weather.windMph,
      weather,
    })
  }, [weather])

  // Get weather condition color and icon
  const getWeatherDisplay = (condition: string) => {
    const lowerCondition = condition.toLowerCase()

    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
      return {
        color: 'warning' as const,
        icon: '☀️',
        label: 'Sunny',
      }
    } else if (
      lowerCondition.includes('cloudy') ||
      lowerCondition.includes('overcast')
    ) {
      return {
        color: 'info' as const,
        icon: '☁️',
        label: 'Cloudy',
      }
    } else if (
      lowerCondition.includes('rain') ||
      lowerCondition.includes('drizzle')
    ) {
      return {
        color: 'primary' as const,
        icon: '🌧️',
        label: 'Rainy',
      }
    } else if (lowerCondition.includes('snow')) {
      return {
        color: 'secondary' as const,
        icon: '❄️',
        label: 'Snowy',
      }
    } else if (
      lowerCondition.includes('fog') ||
      lowerCondition.includes('mist')
    ) {
      return {
        color: 'default' as const,
        icon: '🌫️',
        label: 'Foggy',
      }
    }

    return {
      color: 'default' as const,
      icon: '🌤️',
      label: condition,
    }
  }

  const weatherDisplay = getWeatherDisplay(weather.condition)

  // Get wind impact assessment
  const getWindImpact = (windMph: number) => {
    if (windMph > 20) {
      return { label: 'High Wind Impact', color: 'error' as const }
    } else if (windMph > 15) {
      return { label: 'Moderate Wind Impact', color: 'warning' as const }
    } else if (windMph > 10) {
      return { label: 'Light Wind Impact', color: 'info' as const }
    }
    return { label: 'Minimal Wind Impact', color: 'success' as const }
  }

  const windImpact = getWindImpact(weather.windMph)

  return (
    <Card
      elevation={1}
      sx={{
        mb: 2,
        border: '1px solid rgba(33, 150, 243, 0.2)',
        '&:hover': {
          borderColor: 'primary.main',
          transition: 'border-color 0.2s',
        },
      }}
    >
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CloudIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography
            variant="h6"
            component="h3"
            sx={{
              fontSize: isSmall ? '1rem' : '1.1rem',
              fontWeight: 600,
            }}
          >
            Weather Conditions
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label="Live Data"
              color="success"
              variant="outlined"
              size="small"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          {/* Weather Condition */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: isSmall ? '1.5rem' : '2rem',
                lineHeight: 1,
              }}
            >
              {weatherDisplay.icon}
            </Typography>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: isSmall ? '0.9rem' : '1rem',
                }}
              >
                {weatherDisplay.label}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: isSmall ? '0.75rem' : '0.8rem',
                }}
              >
                {weather.condition}
              </Typography>
            </Box>
          </Box>

          {/* Temperature */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: isMobile ? 'auto' : '120px',
            }}
          >
            <ThermostatIcon
              sx={{
                color: 'error.main',
                fontSize: isSmall ? '1.2rem' : '1.5rem',
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: isSmall ? '1.1rem' : '1.25rem',
                  lineHeight: 1,
                }}
              >
                {weather.temperatureF}°F
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: isSmall ? '0.7rem' : '0.75rem',
                }}
              >
                Temperature
              </Typography>
            </Box>
          </Box>

          {/* Wind */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: isMobile ? 'auto' : '120px',
            }}
          >
            <AirIcon
              sx={{
                color: 'info.main',
                fontSize: isSmall ? '1.2rem' : '1.5rem',
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: isSmall ? '1.1rem' : '1.25rem',
                  lineHeight: 1,
                }}
              >
                {weather.windMph} mph
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: isSmall ? '0.7rem' : '0.75rem',
                }}
              >
                Wind Speed
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Wind Impact Assessment */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Chip
            label={windImpact.label}
            color={windImpact.color}
            variant="outlined"
            size="small"
            sx={{
              fontSize: isSmall ? '0.7rem' : '0.75rem',
              fontWeight: 500,
            }}
          />
        </Box>
      </CardContent>
    </Card>
  )
}

export default WeatherDisplay
