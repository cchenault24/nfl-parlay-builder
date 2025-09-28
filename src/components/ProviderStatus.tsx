import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material'
import React from 'react'
import {
  useProviderHealthQuery,
  useRefreshProviderHealth,
} from '../hooks/providers'
import { useProviderStore } from '../store/providerStore'

/**
 * Component that displays provider health status and allows monitoring
 * This demonstrates the unified state management with provider abstraction
 */
export const ProviderStatus: React.FC = () => {
  const { data: providerHealth, isLoading, error } = useProviderHealthQuery()
  const { mutate: refreshHealth, isPending: isRefreshing } =
    useRefreshProviderHealth()
  const { getHealthyProviders } = useProviderStore()

  const healthyAIProviders = getHealthyProviders('ai')
  const healthyDataProviders = getHealthyProviders('data')

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography>Loading provider status...</Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load provider status: {error.message}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Provider Status</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => refreshHealth()}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              AI Providers
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {healthyAIProviders.length > 0 ? (
                healthyAIProviders.map(provider => (
                  <Chip
                    key={provider}
                    label={provider}
                    color="success"
                    size="small"
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No healthy AI providers
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Data Providers
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {healthyDataProviders.length > 0 ? (
                healthyDataProviders.map(provider => (
                  <Chip
                    key={provider}
                    label={provider}
                    color="success"
                    size="small"
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No healthy data providers
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        {providerHealth && providerHealth.size > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Detailed Status
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              {Array.from(providerHealth.entries()).map(([name, health]) => (
                <Box
                  key={name}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={1}
                  sx={{
                    backgroundColor: health.healthy
                      ? 'success.light'
                      : 'error.light',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={health.healthy ? 'Healthy' : 'Unhealthy'}
                      color={health.healthy ? 'success' : 'error'}
                      size="small"
                    />
                    {health.responseTime && (
                      <Typography variant="caption" color="text.secondary">
                        {health.responseTime}ms
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default ProviderStatus
