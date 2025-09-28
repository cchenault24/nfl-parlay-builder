import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LegalState {
  // Age verification
  isAgeVerified: boolean
  ageVerificationOpen: boolean

  // Modal states
  termsModalOpen: boolean
  privacyModalOpen: boolean
  legalDisclaimerModalOpen: boolean
  responsibleGamblingOpen: boolean

  // Actions
  setAgeVerified: (verified: boolean) => void
  setAgeVerificationOpen: (open: boolean) => void
  setTermsModalOpen: (open: boolean) => void
  setPrivacyModalOpen: (open: boolean) => void
  setLegalDisclaimerModalOpen: (open: boolean) => void
  setResponsibleGamblingOpen: (open: boolean) => void
  closeAllModals: () => void
}

export const useLegalStore = create<LegalState>()(
  persist(
    set => ({
      // Initial state
      isAgeVerified: false,
      ageVerificationOpen: false,
      termsModalOpen: false,
      privacyModalOpen: false,
      legalDisclaimerModalOpen: false,
      responsibleGamblingOpen: false,

      // Actions
      setAgeVerified: verified => set({ isAgeVerified: verified }),
      setAgeVerificationOpen: open => set({ ageVerificationOpen: open }),
      setTermsModalOpen: open => set({ termsModalOpen: open }),
      setPrivacyModalOpen: open => set({ privacyModalOpen: open }),
      setLegalDisclaimerModalOpen: open =>
        set({ legalDisclaimerModalOpen: open }),
      setResponsibleGamblingOpen: open =>
        set({ responsibleGamblingOpen: open }),
      closeAllModals: () =>
        set({
          ageVerificationOpen: false,
          termsModalOpen: false,
          privacyModalOpen: false,
          legalDisclaimerModalOpen: false,
          responsibleGamblingOpen: false,
        }),
    }),
    {
      name: 'nfl-parlay-legal-store',
      partialize: state => ({
        isAgeVerified: state.isAgeVerified,
      }),
    }
  )
)
