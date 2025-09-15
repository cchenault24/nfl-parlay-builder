import {
  Shield as ShieldIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import React, { useState } from 'react'

interface AgeVerificationModalProps {
  open: boolean
  onVerified: () => void
  onDeclined: () => void
}

export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({
  open,
  onVerified,
  onDeclined,
}) => {
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleVerify = () => {
    if (!agreed) {
      setError('You must confirm you are 18 or older to continue.')
      return
    }
    setError('')
    onVerified()
  }

  const handleDecline = () => {
    onDeclined()
  }

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '2px solid #ff9800',
          borderRadius: isMobile ? 0 : 3,
          boxShadow: '0 20px 60px rgba(255, 152, 0, 0.3)',
          maxHeight: isMobile ? '100vh' : '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          background:
            'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.05) 100%)',
          borderBottom: '1px solid rgba(255, 152, 0, 0.3)',
          py: isMobile ? 2 : 2.5,
          px: isMobile ? 2 : 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShieldIcon sx={{ color: '#ff9800', fontSize: isMobile ? 24 : 28 }} />
          <Box>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              component="div"
              sx={{ fontWeight: 700, color: '#fff' }}
            >
              Age Verification Required
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Legal compliance check for adult content
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: isMobile ? 3 : 4, px: isMobile ? 2 : 3 }}>
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{
            my: 3,
            bgcolor: 'rgba(255, 152, 0, 0.1)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#ff9800',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
            This application involves sports betting content and is restricted
            to adults only.
          </Typography>
        </Alert>

        {/* Compact Requirements Section */}
        <Box
          sx={{
            p: 2.5,
            mb: 3,
            bgcolor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
          }}
        >
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{
              color: '#2e7d32',
              fontWeight: 600,
              mb: 1.5,
            }}
          >
            Legal Requirements
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 1,
              mb: 2,
            }}
          >
            {[
              'Must be 18+ years old',
              'Entertainment purposes only',
              'No actual betting occurs',
              'Content for adults only',
            ].map((requirement, index) => (
              <Box
                key={index}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    bgcolor: '#2e7d32',
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" color="rgba(255, 255, 255, 0.8)">
                  {requirement}
                </Typography>
              </Box>
            ))}
          </Box>

          <Typography
            variant="caption"
            color="rgba(255, 255, 255, 0.7)"
            sx={{ fontStyle: 'italic' }}
          >
            Problem gambling? Call 1-800-522-4700 or visit gamblersanonymous.org
          </Typography>
        </Box>

        {/* Compact Checkbox Section */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'rgba(255, 255, 255, 0.02)',
            border: agreed
              ? '2px solid #2e7d32'
              : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            transition: 'all 0.3s ease',
            mb: error ? 2 : 0,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                sx={{
                  color: 'rgba(255, 255, 255, 0.3)',
                  '&.Mui-checked': {
                    color: '#2e7d32',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: 20,
                  },
                }}
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: agreed ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                  transition: 'color 0.3s ease',
                }}
              >
                I confirm that I am 18 years of age or older and understand this
                is for entertainment purposes only.
              </Typography>
            }
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{ px: isMobile ? 2 : 3, pb: isMobile ? 2 : 3, gap: 1.5 }}
      >
        <Button
          onClick={handleDecline}
          variant="outlined"
          color="error"
          size={isMobile ? 'medium' : 'large'}
          sx={{
            px: isMobile ? 2 : 3,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            border: '2px solid #f44336',
            fontSize: isMobile ? '0.875rem' : '1rem',
            '&:hover': {
              border: '2px solid #d32f2f',
              bgcolor: 'rgba(244, 67, 54, 0.1)',
            },
          }}
        >
          I am under 18
        </Button>
        <Button
          onClick={handleVerify}
          variant="contained"
          size={isMobile ? 'medium' : 'large'}
          disabled={!agreed}
          sx={{
            px: isMobile ? 2 : 3,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: isMobile ? '0.875rem' : '1rem',
            background: agreed
              ? 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)'
              : 'rgba(255, 255, 255, 0.1)',
            color: agreed ? '#fff' : 'rgba(255, 255, 255, 0.5)',
            border: agreed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: agreed ? '0 8px 32px rgba(46, 125, 50, 0.3)' : 'none',
            '&:hover': {
              background: agreed
                ? 'linear-gradient(135deg, #1b5e20 0%, #388e3c 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              boxShadow: agreed ? '0 12px 40px rgba(46, 125, 50, 0.4)' : 'none',
              transform: agreed ? 'translateY(-1px)' : 'none',
            },
            '&:disabled': {
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.3)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Continue (18+)
        </Button>
      </DialogActions>
    </Dialog>
  )
}
