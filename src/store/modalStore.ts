import { create } from 'zustand'

interface ModalState {
  authModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void

  termsModalOpen: boolean
  setTermsModalOpen: (open: boolean) => void

  privacyModalOpen: boolean
  setPrivacyModalOpen: (open: boolean) => void

  legalDisclaimerModalOpen: boolean
  setLegalDisclaimerModalOpen: (open: boolean) => void
}

const useModalStore = create<ModalState>(set => ({
  authModalOpen: false,
  setAuthModalOpen: open => set({ authModalOpen: open }),

  termsModalOpen: false,
  setTermsModalOpen: open => set({ termsModalOpen: open }),

  privacyModalOpen: false,
  setPrivacyModalOpen: open => set({ privacyModalOpen: open }),

  legalDisclaimerModalOpen: false,
  setLegalDisclaimerModalOpen: open => set({ legalDisclaimerModalOpen: open }),
}))

export default useModalStore
