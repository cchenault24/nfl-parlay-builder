import { CircularProgress, Dialog, DialogContent } from '@mui/material'
import React from 'react'
import { useLegalDialogConfig } from '../../hooks/useLegalDialogConfig'
import { BaseLegalDialog } from './BaseLegalDialog'
import { useLegalStore } from './store/legalStore'

export const TermsOfServiceDialog: React.FC = () => {
  const termsModalOpen = useLegalStore(state => state.termsModalOpen)
  const setTermsModalOpen = useLegalStore(state => state.setTermsModalOpen)
  const { config, loading, error } = useLegalDialogConfig(
    termsModalOpen,
    'termsOfServiceConfig'
  )

  // Show loading dialog
  if (loading) {
    return (
      <Dialog open={termsModalOpen} maxWidth="sm">
        <DialogContent
          sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        >
          <CircularProgress />
        </DialogContent>
      </Dialog>
    )
  }

  // Show error or nothing if config failed to load
  if (!config || error) {
    return null
  }

  return (
    <BaseLegalDialog
      {...config}
      open={termsModalOpen}
      onClose={() => setTermsModalOpen(false)}
    />
  )
}
