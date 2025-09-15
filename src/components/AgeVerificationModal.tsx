import { Gavel as GavelIcon, Warning as WarningIcon } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Typography,
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
      sx={{
        '& .MuiDialog-paper': {
          border: '2px solid #ff9800',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'rgba(255, 152, 0, 0.1)',
        }}
      >
        <WarningIcon sx={{ color: '#ff9800' }} />
        <Typography variant="h6" component="div">
          Age Verification Required
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            This application involves sports betting content and is restricted
            to adults only.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Legal Requirements
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • You must be 18 years of age or older to access this content
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • This application is for entertainment purposes only
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • No actual betting or wagering takes place on this platform
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • Content may not be suitable for minors
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <GavelIcon fontSize="small" />
            Important Disclaimers
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This app provides AI-generated betting suggestions for entertainment
            purposes only. We do not encourage gambling and strongly recommend
            responsible gaming practices.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            If you or someone you know has a gambling problem, please seek help
            from:
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: '#2e7d32' }}
          >
            • National Problem Gambling Helpline: 1-800-522-4700
            <br />• Gamblers Anonymous: www.gamblersanonymous.org
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              sx={{
                color: '#ff9800',
                '&.Mui-checked': {
                  color: '#2e7d32',
                },
              }}
            />
          }
          label={
            <Typography variant="body2">
              I confirm that I am 18 years of age or older and understand this
              is for entertainment purposes only.
            </Typography>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleDecline}
          variant="outlined"
          color="error"
          size="large"
        >
          I am under 18
        </Button>
        <Button
          onClick={handleVerify}
          variant="contained"
          color="primary"
          size="large"
          disabled={!agreed}
          sx={{ ml: 2 }}
        >
          Continue (18+)
        </Button>
      </DialogActions>
    </Dialog>
  )
}
