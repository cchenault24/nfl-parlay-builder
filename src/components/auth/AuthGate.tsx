import React, { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Casino as CasinoIcon,
  Sports as SportsIcon,
  Psychology as PsychologyIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Login as LoginIcon,
} from '@mui/icons-material'
import { AuthModal } from './AuthModal'
import ParlAIdLogo from '../ParlAIdLogo'

export const AuthGate: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const features = [
    {
      icon: <PsychologyIcon sx={{ fontSize: 40 }} />,
      title: 'AI-Powered Analysis',
      description:
        'Advanced algorithms analyze team stats, player performance, and matchup data to generate intelligent parlay recommendations.',
    },
    {
      icon: <SportsIcon sx={{ fontSize: 40 }} />,
      title: 'Real-Time NFL Data',
      description:
        'Live roster data and current season stats ensure accurate player props and up-to-date betting information.',
    },
    {
      icon: <HistoryIcon sx={{ fontSize: 40 }} />,
      title: 'Parlay History',
      description:
        'Save and track your generated parlays. Build your betting portfolio and analyze AI recommendations over time.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Secure & Private',
      description:
        'Your data is protected with enterprise-grade security. Only you can access your saved parlays and betting history.',
    },
  ]

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hero Section */}
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                display: 'inline-flex',
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 60, color: 'white' }} />
            </Paper>
          </Box>

          <ParlAIdLogo variant="h3" showIcon={false} size="large" />

          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: '600px', mx: 'auto', lineHeight: 1.4 }}
          >
            Harness the power of AI to generate intelligent 3-leg parlays for
            NFL games. Get data-driven insights and build your winning strategy.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            sx={{ mb: 6 }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => setAuthModalOpen(true)}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                textTransform: 'none',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                '&:hover': {
                  background:
                    'linear-gradient(135deg, #1b5e20 0%, #388e3c 100%)',
                },
              }}
            >
              Get Started Free
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => setAuthModalOpen(true)}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                textTransform: 'none',
                borderRadius: 2,
                borderColor: '#2e7d32',
                color: '#2e7d32',
                '&:hover': {
                  borderColor: '#4caf50',
                  backgroundColor: 'rgba(46, 125, 50, 0.1)',
                },
              }}
            >
              Sign In
            </Button>
          </Stack>

          {/* Demo Preview */}
          <Box sx={{ mb: 6 }}>
            <Card
              sx={{
                maxWidth: '500px',
                mx: 'auto',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CasinoIcon sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="h6">Sample AI Parlay</Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <Typography
                      variant="body2"
                      color="primary"
                      fontWeight="bold"
                    >
                      +575
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      Chiefs -3.5 vs Ravens
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Home field advantage with strong rushing defense
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      Travis Kelce Over 65.5 Rec Yards
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      High target share against weak TE coverage
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      Over 48.5 Total Points
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Both teams averaging 28+ PPG this season
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 2, textAlign: 'center' }}
                >
                  ✨ Generated by AI • Sign in to create your own
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Features Section */}
        <Grid container spacing={4} sx={{ mb: 8 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(46, 125, 50, 0.3)',
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Box sx={{ color: '#2e7d32', mb: 2 }}>{feature.icon}</Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ flex: 1 }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* CTA Section */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
            Ready to Build Winning Parlays?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: '500px', mx: 'auto' }}
          >
            Join thousands of bettors using AI to make smarter NFL parlay
            decisions. Create your free account and start generating parlays in
            seconds.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<LoginIcon />}
            onClick={() => setAuthModalOpen(true)}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              textTransform: 'none',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
              boxShadow: '0 8px 32px rgba(46, 125, 50, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1b5e20 0%, #388e3c 100%)',
                boxShadow: '0 12px 40px rgba(46, 125, 50, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Create Free Account
          </Button>
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ py: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" textAlign="center">
            © 2024 NFL Parlay Builder. AI-powered sports betting insights.
          </Typography>
        </Container>
      </Box>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </Box>
  )
}
