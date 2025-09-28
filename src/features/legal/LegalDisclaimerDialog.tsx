import { CircularProgress, Dialog, DialogContent } from '@mui/material'
import React from 'react'
import { useLegalDialogConfig } from '../../hooks/useLegalDialogConfig'
import { BaseLegalDialog } from './BaseLegalDialog'
import { useLegalStore } from './store/legalStore'

export const LegalDisclaimerDialog: React.FC = () => {
  const legalDisclaimerModalOpen = useLegalStore(
    state => state.legalDisclaimerModalOpen
  )
  const setLegalDisclaimerModalOpen = useLegalStore(
    state => state.setLegalDisclaimerModalOpen
  )
  const { config, loading, error } = useLegalDialogConfig(
    legalDisclaimerModalOpen,
    'legalDisclaimerConfig'
  )

  if (loading) {
    return (
      <Dialog open={legalDisclaimerModalOpen} maxWidth="sm">
        <DialogContent
          sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        >
          <CircularProgress />
        </DialogContent>
      </Dialog>
    )
  }

  if (!config || error) {
    return null
  }

  return (
    <BaseLegalDialog
      {...config}
      open={legalDisclaimerModalOpen}
      onClose={() => setLegalDisclaimerModalOpen(false)}
    />
  )
}
