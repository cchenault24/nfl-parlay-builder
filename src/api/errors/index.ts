export { APIError } from './APIError'
export { ESPNError, ESPNGamesError, ESPNRosterError } from './ESPNError'
export {
  OpenAIError,
  OpenAIParsingError,
  OpenAIRateLimitError,
} from './OpenAIError'

// Import for use in utility functions
import { APIError } from './APIError'

// Utility function to determine if an error is an API error
export const isAPIError = (error: unknown): error is APIError => {
  return error instanceof APIError
}

// Utility function to extract user-friendly message from any error
export const getErrorMessage = (error: unknown): string => {
  if (isAPIError(error)) {
    return error.getUserFriendlyMessage()
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
