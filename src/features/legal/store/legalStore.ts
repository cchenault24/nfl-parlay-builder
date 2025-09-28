import {
  createFeatureStore,
  createResetAction,
  createSafeMigration,
  createToggleAction,
} from '../../../utils'

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
  (set, get) => ({
    // Age verification actions
    setAgeVerified: verified => set({ isAgeVerified: verified }),
    setAgeVerificationOpen: open => set({ ageVerificationOpen: open }),
    toggleAgeVerification: () => set(createToggleAction('ageVerificationOpen')),

    // Modal actions
    setTermsModalOpen: open => set({ termsModalOpen: open }),
    setPrivacyModalOpen: open => set({ privacyModalOpen: open }),
    setLegalDisclaimerModalOpen: open =>
      set({ legalDisclaimerModalOpen: open }),
    setResponsibleGamblingOpen: open => set({ responsibleGamblingOpen: open }),

    // Toggle actions for modals
    toggleTermsModal: () => set(createToggleAction('termsModalOpen')),
    togglePrivacyModal: () => set(createToggleAction('privacyModalOpen')),
    toggleLegalDisclaimerModal: () =>
      set(createToggleAction('legalDisclaimerModalOpen')),
    toggleResponsibleGambling: () =>
      set(createToggleAction('responsibleGamblingOpen')),

    // Reset actions
    closeAllModals: createResetAction({
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
    partialize: state => ({
      isAgeVerified: state.isAgeVerified,
    }),
    migrate: createSafeMigration(initialState, 1),
  }
)
