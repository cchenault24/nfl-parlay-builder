import { CircularProgress, Dialog, DialogContent } from '@mui/material'
import React from 'react'
import { useLegalDialogConfig } from '../../hooks/useLegalDialogConfig'
import useModalStore from '../../store/modalStore'
import { BaseLegalDialog } from './BaseLegalDialog'

export const TermsOfServiceDialog: React.FC = () => {
  const termsModalOpen = useModalStore(state => state.termsModalOpen)
  const setTermsModalOpen = useModalStore(state => state.setTermsModalOpen)
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
