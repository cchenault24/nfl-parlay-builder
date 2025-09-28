import { Info as InfoIcon, Phone as PhoneIcon } from '@mui/icons-material'
import { Box, Chip, Container, Grid, Link, Typography } from '@mui/material'
import React from 'react'
import { LegalDisclaimerDialog } from './LegalDisclaimerDialog'
import { PrivacyPolicyDialog } from './PrivacyPolicyDialog'
import { useLegalStore } from './store/legalStore'
import { TermsOfServiceDialog } from './TermsOfServiceDialog'

interface LegalFooterProps {
  onResponsibleGamblingClick: () => void
}

export const LegalFooter: React.FC<LegalFooterProps> = ({
  onResponsibleGamblingClick,
}) => {
  // Modal store actions
  const setTermsModalOpen = useLegalStore(state => state.setTermsModalOpen)
  const setPrivacyModalOpen = useLegalStore(state => state.setPrivacyModalOpen)
  const setLegalDisclaimerModalOpen = useLegalStore(
    state => state.setLegalDisclaimerModalOpen
  )

  const currentYear = new Date().getFullYear()

  return (
    <>
      <Box
        component="footer"
        sx={{
          py: 3,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          mt: 'auto',
        }}
      >
        <Container maxWidth="lg">
          <Grid
            container
            spacing={3}
            alignItems="flex-end"
            justifyContent="center"
          >
            {/* Entertainment Notice */}
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  justifyContent: { xs: 'center', md: 'flex-start' },
                }}
              >
                <Chip
                  icon={<InfoIcon />}
                  label="ENTERTAINMENT ONLY"
                  color="warning"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label="18+"
                  color="error"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: { xs: 'center', md: 'left' } }}
              >
                AI-generated analysis and parlays for entertainment.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: { xs: 'center', md: 'left' } }}
              >
                No actual betting occurs.
              </Typography>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  justifyContent: 'center',
                }}
              >
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => setTermsModalOpen(true)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: '#2e7d32' },
                  }}
                >
                  Terms
                </Link>
                <Typography variant="caption" color="text.secondary">
                  •
                </Typography>
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => setPrivacyModalOpen(true)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: '#2e7d32' },
                  }}
                >
                  Privacy
                </Link>
                <Typography variant="caption" color="text.secondary">
                  •
                </Typography>
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => setLegalDisclaimerModalOpen(true)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: '#2e7d32' },
                  }}
                >
                  Legal
                </Link>
                <Typography variant="caption" color="text.secondary">
                  •
                </Typography>
                <Link
                  component="button"
                  variant="caption"
                  onClick={onResponsibleGamblingClick}
                  sx={{
                    color: '#2e7d32',
                    fontWeight: 600,
                    '&:hover': { color: '#4caf50' },
                  }}
                >
                  Get Help
                </Link>
              </Box>
            </Grid>

            {/* Help & Copyright */}
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: { xs: 'center', md: 'flex-end' },
                    mb: 0.5,
                  }}
                >
                  <PhoneIcon sx={{ fontSize: 14, color: '#2e7d32' }} />
                  <Link
                    href="tel:1-800-522-4700"
                    variant="caption"
                    sx={{
                      color: '#2e7d32',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    1-800-522-4700
                  </Link>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  © {currentYear} ParlAId.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <TermsOfServiceDialog />
      <PrivacyPolicyDialog />
      <LegalDisclaimerDialog />
    </>
  )
}
