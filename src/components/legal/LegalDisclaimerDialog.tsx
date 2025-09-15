import { CircularProgress, Dialog, DialogContent } from '@mui/material'
import React from 'react'
import { useLegalDialogConfig } from '../../hooks/useLegalDialogConfig'
import useModalStore from '../../store/modalStore'
import { BaseLegalDialog } from './BaseLegalDialog'

export const LegalDisclaimerDialog: React.FC = () => {
  const legalDisclaimerModalOpen = useModalStore(
    state => state.legalDisclaimerModalOpen
  )
  const setLegalDisclaimerModalOpen = useModalStore(
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
