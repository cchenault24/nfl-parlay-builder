import { Gavel as GavelIcon, Info as InfoIcon } from '@mui/icons-material'
import { Alert, Box, Link, Typography } from '@mui/material'
import React from 'react'

interface LegalDisclaimerProps {
  variant?: 'full' | 'compact' | 'inline'
  showResponsibleGamblingLink?: boolean
}

export const LegalDisclaimer: React.FC<LegalDisclaimerProps> = ({
  variant = 'full',
  showResponsibleGamblingLink = true,
}) => {
  if (variant === 'inline') {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontStyle: 'italic' }}
      >
        For entertainment purposes only. 18+ only.{' '}
        {showResponsibleGamblingLink && (
          <Link
            href="#responsible-gambling"
            onClick={e => {
              e.preventDefault()
              // This will be handled by the parent component
              console.log('Navigate to responsible gambling page')
            }}
            sx={{ color: '#ff9800' }}
          >
            Gambling Problem? Get Help.
          </Link>
        )}
      </Typography>
    )
  }

  if (variant === 'compact') {
    return (
      <Alert
        severity="info"
        icon={<InfoIcon />}
        sx={{
          bgcolor: 'rgba(46, 125, 50, 0.1)',
          border: '1px solid rgba(46, 125, 50, 0.3)',
          '& .MuiAlert-icon': {
            color: '#2e7d32',
          },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Entertainment Only - 18+ Required
        </Typography>
        <Typography variant="caption" color="text.secondary">
          AI-generated parlays for entertainment purposes. No real betting
          occurs on this platform.
        </Typography>
      </Alert>
    )
  }

  // Full variant
  return (
    <Box sx={{ mb: 3 }}>
      <Alert
        severity="warning"
        icon={<GavelIcon />}
        sx={{
          bgcolor: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          mb: 2,
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Important Legal Notice
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>This application is for entertainment purposes only.</strong>{' '}
          All parlay suggestions are AI-generated and intended for informational
          and entertainment use. No actual betting, wagering, or gambling takes
          place on this platform.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Age Restriction:</strong> You must be 18 years or older to use
          this service. By using this application, you confirm that you meet
          this age requirement.
        </Typography>
        <Typography variant="body2">
          <strong>No Guarantees:</strong> AI-generated suggestions do not
          guarantee outcomes. All sports betting involves risk. Please bet
          responsibly if you choose to place actual wagers through licensed
          operators.
        </Typography>
      </Alert>

      {showResponsibleGamblingLink && (
        <Alert
          severity="info"
          sx={{
            bgcolor: 'rgba(46, 125, 50, 0.1)',
            border: '1px solid rgba(46, 125, 50, 0.3)',
          }}
        >
          <Typography variant="body2">
            <strong>Need Help?</strong> If you or someone you know has a
            gambling problem, resources are available.{' '}
            <Link
              href="#responsible-gambling"
              onClick={e => {
                e.preventDefault()
                console.log('Navigate to responsible gambling page')
              }}
              sx={{ color: '#2e7d32', fontWeight: 600 }}
            >
              View Responsible Gambling Resources →
            </Link>
          </Typography>
        </Alert>
      )}
    </Box>
  )
}
