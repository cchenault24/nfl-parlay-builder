import { useEntitlements } from '@shared/hooks/useEntitlements'
import { proFeatures } from '@shared/proFeatures'
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

// Written from the capabilities the server sends rather than as sentences with
// the numbers spelled into them — the matrix lives in the tiering doc, and a
// limit widened server-side used to leave a paid feature unadvertised here.

interface UpgradeDialogProps {
  open: boolean
  onClose: () => void
  // False while billing has no credentials. The features are still worth
  // showing — this is what Pro will be — but an Upgrade button that can only
  // fail is worse than none.
  canPurchase: boolean
  // What the user was trying to do when they hit the lock, so the dialog opens
  // on their own intent rather than a generic pitch.
  reason?: string
}

const UpgradeDialog: React.FC<UpgradeDialogProps> = ({
  open,
  onClose,
  canPurchase,
  reason,
}) => {
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const { entitlements } = useEntitlements()
  // Optional-chained because the clients and the API deploy separately: a build
  // that ships before the server sends proCapabilities would otherwise throw
  // here rather than simply showing no feature list.
  const features = entitlements?.proCapabilities
    ? proFeatures(entitlements.proCapabilities, entitlements.capabilities)
    : []

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
          {canPurchase
            ? 'Monthly subscription. Cancel any time.'
            : 'Not on sale yet.'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {reason && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            {reason}
          </Typography>
        )}

        <List dense disablePadding>
          {features.map(feature => (
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
          {canPurchase ? 'Not now' : 'Close'}
        </Button>
        {canPurchase && (
          <Button variant="contained" onClick={startCheckout} disabled={starting}>
            {starting ? 'Opening checkout…' : 'Upgrade'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default UpgradeDialog
