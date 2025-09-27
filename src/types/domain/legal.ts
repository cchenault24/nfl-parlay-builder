// ------------------------------------------------------------------------------------------------
// src/types/domain/legal.ts - Legal/compliance types
// ------------------------------------------------------------------------------------------------
export interface LegalDialogConfig {
  title: string
  content: string
  acceptButtonText?: string
  declineButtonText?: string
  isRequired?: boolean
}

export interface AgeVerificationState {
  isVerified: boolean
  isLoading: boolean
  dateOfBirth?: string
}
