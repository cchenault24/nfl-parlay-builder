import CheckIcon from '@mui/icons-material/Check'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import { EntitlementsService } from '@shared/api/EntitlementsService'
import { sharedRuntime } from '@shared/runtime'
import React, { useState } from 'react'

const service = new EntitlementsService()

// Written as what Pro does, not as a feature matrix — the matrix lives in the
// tiering doc. Order is deliberate: the volume limit is what most people hit
// first, and props are the hook the spec identifies as Pro's strongest.
const PRO_FEATURES = [
  'Unlimited parlays — no weekly limit',
  'Player props, on top of the game markets',
  'Conservative, moderate and aggressive risk levels',
  'Parlays from 2 to 6 legs',
  'Price every leg on your own sportsbook',
  'Your full history, every season, with win rate and ROI',
]

interface UpgradeDialogProps {
  open: boolean
  onClose: () => void
  // What the user was trying to do when they hit the lock, so the dialog opens
  // on their own intent rather than a generic pitch.
  reason?: string
}

const UpgradeDialog: React.FC<UpgradeDialogProps> = ({ open, onClose, reason }) => {
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const startCheckout = async () => {
    setStarting(true)
    setError(null)
    try {
      const token = await sharedRuntime().getIdToken()
      if (!token) {
        throw new Error('Please sign in again to upgrade.')
      }
      window.location.href = await service.startCheckout(token)
    } catch (e) {
      // No auto-retry: the failure is surfaced and the user decides.
      setError(e instanceof Error ? e.message : 'Could not start checkout.')
      setStarting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
          ParlAId Pro
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          $4.99 a month. Cancel any time.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {reason && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            {reason}
          </Typography>
        )}

        <List dense disablePadding>
          {PRO_FEATURES.map(feature => (
            <ListItem key={feature} disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText
                primary={feature}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            For entertainment only. No wagers are placed through ParlAId.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Not now
        </Button>
        <Button variant="contained" onClick={startCheckout} disabled={starting}>
          {starting ? 'Opening checkout…' : 'Upgrade'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UpgradeDialog
