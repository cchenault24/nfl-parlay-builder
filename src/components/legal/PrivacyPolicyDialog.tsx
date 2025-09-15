// src/components/legal/PrivacyPolicyDialog.tsx
import React from 'react'
import useModalStore from '../../store/modalStore'
import { BaseLegalDialog } from './BaseLegalDialog'
import { privacyPolicyConfig } from './legalDialogConfigs'

export const PrivacyPolicyDialog: React.FC = () => {
  const privacyModalOpen = useModalStore(state => state.privacyModalOpen)
  const setPrivacyModalOpen = useModalStore(state => state.setPrivacyModalOpen)

  return (
    <BaseLegalDialog
      {...privacyPolicyConfig}
      open={privacyModalOpen}
      onClose={() => setPrivacyModalOpen(false)}
    />
  )
}
