import { Box, Skeleton, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { getTeamLogoUrl } from '../../utils/teamLogos'

export interface TeamLogoProps {
  teamName: string
  size?: 'small' | 'medium' | 'large'
  showFallback?: boolean
  fallbackText?: string
  className?: string
  sx?: object
}

const sizeMap = {
  small: { width: 24, height: 24 },
  medium: { width: 40, height: 40 },
  large: { width: 64, height: 64 },
}

const TeamLogo: React.FC<TeamLogoProps> = ({
  teamName,
  size = 'medium',
  showFallback = true,
  fallbackText,
  className,
  sx = {},
}) => {
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadLogo = async () => {
      if (!teamName) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setHasError(false)

        // Get logo URL directly
        const url = getTeamLogoUrl(teamName)

        if (isMounted) {
          setLogoUrl(url)
          setIsLoading(false)
        }
      } catch {
        if (isMounted) {
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    loadLogo()

    return () => {
      isMounted = false
    }
  }, [teamName])

  const dimensions = sizeMap[size]
  const fallbackDisplayText = fallbackText || teamName.slice(0, 3).toUpperCase()

  if (isLoading) {
    return (
      <Skeleton
        variant="rectangular"
        width={dimensions.width}
        height={dimensions.height}
        sx={{
          borderRadius: 1,
          ...sx,
        }}
        className={className}
      />
    )
  }

  if (hasError || !logoUrl) {
    if (!showFallback) {
      return null
    }

    return (
      <Box
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.200',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.300',
          ...sx,
        }}
        className={className}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 'bold',
            color: 'text.secondary',
            fontSize:
              size === 'small'
                ? '0.6rem'
                : size === 'medium'
                  ? '0.75rem'
                  : '1rem',
          }}
        >
          {fallbackDisplayText}
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      component="img"
      src={logoUrl}
      alt={`${teamName} logo`}
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        objectFit: 'contain',
        borderRadius: 1,
        ...sx,
      }}
      className={className}
      onError={() => {
        setHasError(true)
        setLogoUrl('')
      }}
    />
  )
}

export default TeamLogo
