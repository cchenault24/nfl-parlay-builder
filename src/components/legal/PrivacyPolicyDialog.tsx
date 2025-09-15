import { CircularProgress, Dialog, DialogContent } from '@mui/material'
import React from 'react'
import { useLegalDialogConfig } from '../../hooks/useLegalDialogConfig'
import useModalStore from '../../store/modalStore'
import { BaseLegalDialog } from './BaseLegalDialog'

export const PrivacyPolicyDialog: React.FC = () => {
  const privacyModalOpen = useModalStore(state => state.privacyModalOpen)
  const setPrivacyModalOpen = useModalStore(state => state.setPrivacyModalOpen)
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
