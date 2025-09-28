import { CircularProgress, Dialog, DialogContent } from '@mui/material'
import React from 'react'
import { useLegalDialogConfig } from '../../hooks/useLegalDialogConfig'
import { BaseLegalDialog } from './BaseLegalDialog'
import { useLegalStore } from './store/legalStore'

export const PrivacyPolicyDialog: React.FC = () => {
  const privacyModalOpen = useLegalStore(state => state.privacyModalOpen)
  const setPrivacyModalOpen = useLegalStore(state => state.setPrivacyModalOpen)
  const { config, loading, error } = useLegalDialogConfig(
    privacyModalOpen,
    'privacyPolicyConfig'
  )

  if (loading) {
    return (
      <Dialog open={privacyModalOpen} maxWidth="sm">
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
      open={privacyModalOpen}
      onClose={() => setPrivacyModalOpen(false)}
    />
  )
}
