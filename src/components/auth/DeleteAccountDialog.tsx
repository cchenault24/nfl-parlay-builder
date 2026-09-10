import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material'
import { AccountService } from '@shared/api/AccountService'
import { sharedRuntime } from '@shared/runtime'
import React, { useState } from 'react'
import { logOut } from '../../config/firebase'

const service = new AccountService()
const CONFIRM = 'DELETE'

// Typing the word is deliberate friction. This is the one action in the app
// that cannot be undone, and a misplaced click on a menu item should not be
// able to reach it.
const DeleteAccountDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const close = () => {
    setConfirmation('')
    setError(null)
    onClose()
  }

  const remove = async () => {
    setDeleting(true)
    setError(null)
    try {
      const token = await sharedRuntime().getIdToken()
      if (!token) {
        throw new Error('Please sign in again to delete your account.')
      }
      await service.deleteAccount(token)
      await logOut()
    } catch (e) {
      // No auto-retry: the failure is surfaced and the user decides.
      setError(e instanceof Error ? e.message : 'Could not delete your account.')
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onClose={deleting ? undefined : close} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Delete your account?</DialogTitle>
      <DialogContent>
        <DialogContentText variant="body2">
          This removes your profile, every parlay you have saved and your generation
          history. It cannot be undone.
        </DialogContentText>
        <DialogContentText variant="body2" sx={{ mt: 1.5 }}>
          Parlays you shared with a link stay reachable by that link. They carry no
          name or account, and you can revoke a link before deleting if you would
          rather it stopped working.
        </DialogContentText>
        <TextField
          fullWidth
          size="small"
          sx={{ mt: 2.5 }}
          label={`Type ${CONFIRM} to confirm`}
          value={confirmation}
          onChange={e => setConfirmation(e.target.value)}
          disabled={deleting}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} color="inherit" disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={remove}
          disabled={confirmation !== CONFIRM || deleting}
        >
          {deleting ? 'Deleting…' : 'Delete account'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteAccountDialog
