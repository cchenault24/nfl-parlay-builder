import {
  Close as CloseIcon,
  Gavel as GavelIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'

interface LegalFooterProps {
  onResponsibleGamblingClick: () => void
}

export const LegalFooter: React.FC<LegalFooterProps> = ({
  onResponsibleGamblingClick,
}) => {
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)

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
          {/* Main Footer Content */}
          <Grid
            container
            spacing={3}
            alignItems="center"
            justifyContent="center"
          >
            {/* Entertainment Notice - Made wider */}
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

            {/* Quick Links - Made slightly narrower */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  justifyContent: 'center', // Always center the links
                }}
              >
                <Link
                  component="button"
                  variant="caption"
                  onClick={() => setTermsOpen(true)}
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
                  onClick={() => setPrivacyOpen(true)}
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
                  onClick={() => setLegalOpen(true)}
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

            {/* Help & Copyright - Made narrower */}
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
                  © {currentYear} ParlAId. For entertainment only.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Keep all the modal dialogs the same... */}
      {/* Terms Modal */}
      <Dialog
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GavelIcon />
            Terms of Service
          </Box>
          <IconButton onClick={() => setTermsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>1. Entertainment Only:</strong> This application is for
            entertainment purposes only. No actual betting, wagering, or
            gambling takes place on this platform.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>2. Age Requirement:</strong> You must be 18 years or older
            to use this service.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>3. AI Suggestions:</strong> All parlay suggestions are
            generated by artificial intelligence for entertainment purposes and
            do not guarantee outcomes.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>4. No Liability:</strong> We are not responsible for any
            decisions you make based on AI-generated suggestions.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>5. Responsible Use:</strong> By using this service, you
            agree to use it responsibly and seek help if gambling becomes a
            problem.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Modal */}
      <Dialog
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon />
            Privacy Policy
          </Box>
          <IconButton onClick={() => setPrivacyOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Information We Collect:</strong> We only collect information
            necessary to provide our entertainment service, including user
            authentication data and parlay history.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>How We Use Information:</strong> Your information is used
            solely to provide the AI parlay generation service and improve user
            experience.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Data Security:</strong> We implement appropriate security
            measures to protect your personal information.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Third Parties:</strong> We do not sell or share your
            personal information with third parties for marketing purposes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrivacyOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Legal Disclaimer Modal */}
      <Dialog
        open={legalOpen}
        onClose={() => setLegalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GavelIcon />
            Legal Disclaimer
          </Box>
          <IconButton onClick={() => setLegalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            <strong>Entertainment Purpose:</strong> This application is designed
            solely for entertainment and educational purposes. No actual betting
            or gambling occurs on this platform.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>No Guarantees:</strong> AI-generated parlay suggestions are
            based on statistical analysis and do not guarantee any outcomes.
            Sports betting involves risk.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Not Financial Advice:</strong> Nothing on this platform
            constitutes financial or betting advice. Users should make their own
            informed decisions.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Age Restriction:</strong> This service is restricted to
            users who are 18 years of age or older.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Responsible Gambling:</strong> If you choose to place real
            bets elsewhere, please do so responsibly and within your means. Seek
            help if gambling becomes a problem.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Limitation of Liability:</strong> We are not liable for any
            losses or damages resulting from the use of this entertainment
            platform.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
