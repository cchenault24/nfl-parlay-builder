// src/components/legal/LegalDisclaimerDialog.tsx
import React from 'react'
import useModalStore from '../../store/modalStore'
import { BaseLegalDialog } from './BaseLegalDialog'
import { legalDisclaimerConfig } from './legalDialogConfigs'

export const LegalDisclaimerDialog: React.FC = () => {
  const legalDisclaimerModalOpen = useModalStore(
    state => state.legalDisclaimerModalOpen
  )
  const setLegalDisclaimerModalOpen = useModalStore(
    state => state.setLegalDisclaimerModalOpen
  )

  return (
    <BaseLegalDialog
      {...legalDisclaimerConfig}
      open={legalDisclaimerModalOpen}
      onClose={() => setLegalDisclaimerModalOpen(false)}
    />
  )
}
