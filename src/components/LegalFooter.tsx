import {
  Close as CloseIcon,
  Gavel as GavelIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
          py: 4,
          mt: 6,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <Container maxWidth="lg">
          {/* Entertainment Notice */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#ff9800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <InfoIcon />
              FOR ENTERTAINMENT PURPOSES ONLY
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              This platform provides AI-generated parlay suggestions for
              entertainment only. No actual betting occurs here. Must be 18+ to
              use. Please gamble responsibly.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Footer Links */}
          <Grid container spacing={4} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Legal
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setTermsOpen(true)}
                  sx={{ textAlign: 'left', color: 'text.secondary' }}
                >
                  Terms of Service
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setPrivacyOpen(true)}
                  sx={{ textAlign: 'left', color: 'text.secondary' }}
                >
                  Privacy Policy
                </Link>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setLegalOpen(true)}
                  sx={{ textAlign: 'left', color: 'text.secondary' }}
                >
                  Legal Disclaimer
                </Link>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Support
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={onResponsibleGamblingClick}
                  sx={{ textAlign: 'left', color: '#2e7d32', fontWeight: 600 }}
                >
                  Responsible Gambling
                </Link>
                <Link
                  href="tel:1-800-522-4700"
                  variant="body2"
                  sx={{ textAlign: 'left', color: 'text.secondary' }}
                >
                  Problem Gambling: 1-800-522-4700
                </Link>
                <Link
                  href="tel:988"
                  variant="body2"
                  sx={{ textAlign: 'left', color: 'text.secondary' }}
                >
                  Crisis Support: 988
                </Link>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Age Restriction
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  You must be 18 years or older to use this service.
                </Typography>
                <Typography
                  variant="body2"
                  color="#ff9800"
                  sx={{ fontWeight: 600 }}
                >
                  18+ ONLY
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Disclaimer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI suggestions are for entertainment only and do not guarantee
                outcomes. No actual betting occurs on this platform.
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Copyright */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} ParlAId. All rights reserved. For entertainment
              purposes only.
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Not affiliated with the NFL. Team names and logos are trademarks
              of their respective owners.
            </Typography>
          </Box>
        </Container>
      </Box>

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
