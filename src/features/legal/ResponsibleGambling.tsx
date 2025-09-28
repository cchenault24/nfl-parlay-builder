import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Support as SupportIcon,
  Warning as WarningIcon,
  Web as WebIcon,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import React from 'react'

interface ResponsibleGamblingProps {
  onBack: () => void
}

export const ResponsibleGambling: React.FC<ResponsibleGamblingProps> = ({
  onBack,
}) => {
  const helplines = [
    {
      name: 'National Problem Gambling Helpline',
      phone: '1-800-522-4700',
      website: 'ncpgambling.org',
      description: '24/7 confidential support for problem gambling',
    },
    {
      name: 'Gamblers Anonymous',
      phone: 'Local chapter meetings',
      website: 'gamblersanonymous.org',
      description: 'Peer support groups and recovery programs',
    },
    {
      name: 'National Suicide Prevention Lifeline',
      phone: '988',
      website: 'suicidepreventionlifeline.org',
      description: 'Crisis support and mental health resources',
    },
    {
      name: 'Crisis Text Line',
      phone: 'Text HOME to 741741',
      website: 'crisistextline.org',
      description: 'Free, 24/7 crisis support via text message',
    },
  ]

  const warningSignsData = [
    'Spending more money on betting than you can afford to lose',
    'Chasing losses with bigger or more frequent bets',
    'Lying to family and friends about gambling activities',
    'Neglecting work, school, or family responsibilities to gamble',
    'Feeling anxious, depressed, or irritable when not gambling',
    'Borrowing money or selling possessions to fund gambling',
    'Unable to cut back or stop gambling despite wanting to',
    'Gambling to escape problems or negative emotions',
  ]

  const responsiblePractices = [
    'Set strict limits on time and money spent gambling',
    'Never gamble money you cannot afford to lose',
    'View gambling as entertainment, not a way to make money',
    'Take regular breaks and avoid gambling when emotional',
    'Keep track of time and money spent gambling',
    'Do not chase losses with bigger bets',
    'Seek help if gambling becomes a problem',
    'Use self-exclusion tools when available',
  ]

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Back to App
        </Button>

        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          Responsible Gambling Resources
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Your health and wellbeing are more important than any bet. If gambling
          is causing problems in your life, help is available.
        </Typography>
      </Box>

      <Alert
        severity="error"
        icon={<WarningIcon />}
        sx={{ mb: 4, fontSize: '1.1rem' }}
      >
        <Typography variant="h6" gutterBottom>
          {`If you're having thoughts of suicide or self-harm, please get help
          immediately:`}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {`Call 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis
          Text Line)`}
        </Typography>
      </Alert>

      <Grid container spacing={4}>
        {/* Help Resources */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <SupportIcon color="primary" />
                Immediate Help Resources
              </Typography>

              <Typography variant="body1" color="text.secondary" paragraph>
                These organizations provide free, confidential support for
                gambling problems:
              </Typography>

              {helplines.map((helpline, index) => (
                <Box key={`helpline-${helpline}`} sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {helpline.name}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <PhoneIcon fontSize="small" color="primary" />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {helpline.phone}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <WebIcon fontSize="small" color="primary" />
                    <Link
                      href={`https://${helpline.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: '#2e7d32' }}
                    >
                      {helpline.website}
                    </Link>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {helpline.description}
                  </Typography>

                  {index < helplines.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Warning Signs */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <WarningIcon color="warning" />
                Warning Signs of Problem Gambling
              </Typography>

              <Typography variant="body1" color="text.secondary" paragraph>
                Watch for these signs that gambling may be becoming a problem:
              </Typography>

              <List dense>
                {warningSignsData.map(sign => (
                  <ListItem key={`warning-signs-${sign}`} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={sign}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Responsible Practices */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <CheckCircleIcon color="success" />
                Responsible Gambling Practices
              </Typography>

              <Typography variant="body1" color="text.secondary" paragraph>
                If you choose to gamble, follow these guidelines to reduce risk:
              </Typography>

              <Grid container spacing={2}>
                {responsiblePractices.map(practice => (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    key={`responsible-practices-${practice}`}
                  >
                    <Box
                      sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
                    >
                      <CheckCircleIcon
                        fontSize="small"
                        color="success"
                        sx={{ mt: 0.5, flexShrink: 0 }}
                      />
                      <Typography variant="body2">{practice}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* About This App */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="h6" gutterBottom>
              About ParlAId
            </Typography>
            <Typography variant="body2" paragraph>
              This application is designed for entertainment purposes only. We
              use AI to generate parlay suggestions based on statistical
              analysis, but these suggestions do not guarantee outcomes and
              should never be used as the sole basis for real betting decisions.
            </Typography>
            <Typography variant="body2">
              <strong>No actual betting occurs on this platform.</strong> If you
              choose to place real bets, please do so only through licensed,
              regulated operators and always within your financial means.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Container>
  )
}
