// src/components/legal/TermsOfServiceDialog.tsx
import React from 'react'
import useModalStore from '../../store/modalStore'
import { BaseLegalDialog } from './BaseLegalDialog'
import { termsOfServiceConfig } from './legalDialogConfigs'

export const TermsOfServiceDialog: React.FC = () => {
  const termsModalOpen = useModalStore(state => state.termsModalOpen)
  const setTermsModalOpen = useModalStore(state => state.setTermsModalOpen)

  return (
    <BaseLegalDialog
      {...termsOfServiceConfig}
      open={termsModalOpen}
      onClose={() => setTermsModalOpen(false)}
    />
  )
}
