import { createFeatureStore, createSafeMigration } from '../../../utils'

interface LegalState {
  // Age verification
  isAgeVerified: boolean
  ageVerificationOpen: boolean

  // Modal states
  termsModalOpen: boolean
  privacyModalOpen: boolean
  legalDisclaimerModalOpen: boolean
  responsibleGamblingOpen: boolean
}

interface LegalActions {
  // Age verification actions
  setAgeVerified: (verified: boolean) => void
  setAgeVerificationOpen: (open: boolean) => void
  toggleAgeVerification: () => void

  // Modal actions
  setTermsModalOpen: (open: boolean) => void
  setPrivacyModalOpen: (open: boolean) => void
  setLegalDisclaimerModalOpen: (open: boolean) => void
  setResponsibleGamblingOpen: (open: boolean) => void

  // Toggle actions for modals
  toggleTermsModal: () => void
  togglePrivacyModal: () => void
  toggleLegalDisclaimerModal: () => void
  toggleResponsibleGambling: () => void

  // Reset actions
  closeAllModals: () => void
}

const initialState: LegalState = {
  isAgeVerified: false,
  ageVerificationOpen: false,
  termsModalOpen: false,
  privacyModalOpen: false,
  legalDisclaimerModalOpen: false,
  responsibleGamblingOpen: false,
}

export const useLegalStore = createFeatureStore<LegalState, LegalActions>(
  initialState,
  set => ({
    // Age verification actions
    setAgeVerified: verified => set({ isAgeVerified: verified }),
    setAgeVerificationOpen: open => set({ ageVerificationOpen: open }),
    toggleAgeVerification: () => {
      const currentState = useLegalStore.getState()
      set({ ageVerificationOpen: !currentState.ageVerificationOpen })
    },

    // Modal actions
    setTermsModalOpen: open => set({ termsModalOpen: open }),
    setPrivacyModalOpen: open => set({ privacyModalOpen: open }),
    setLegalDisclaimerModalOpen: open =>
      set({ legalDisclaimerModalOpen: open }),
    setResponsibleGamblingOpen: open => set({ responsibleGamblingOpen: open }),

    // Toggle actions for modals
    toggleTermsModal: () => {
      const currentState = useLegalStore.getState()
      set({ termsModalOpen: !currentState.termsModalOpen })
    },
    togglePrivacyModal: () => {
      const currentState = useLegalStore.getState()
      set({ privacyModalOpen: !currentState.privacyModalOpen })
    },
    toggleLegalDisclaimerModal: () => {
      const currentState = useLegalStore.getState()
      set({ legalDisclaimerModalOpen: !currentState.legalDisclaimerModalOpen })
    },
    toggleResponsibleGambling: () => {
      const currentState = useLegalStore.getState()
      set({ responsibleGamblingOpen: !currentState.responsibleGamblingOpen })
    },

    // Reset actions
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
    version: 1,
    partialize: (state: LegalState) => ({
      isAgeVerified: state.isAgeVerified,
    }),
    migrate: createSafeMigration(initialState, 1) as (
      persistedState: unknown,
      version: number
    ) => LegalState & LegalActions,
  }
)
