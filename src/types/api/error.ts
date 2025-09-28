// ================================================================================================
// ERROR TYPES - Specific error interfaces for better type safety
// ================================================================================================

export interface APIError {
  status?: number
  message?: string
  code?: string
  details?: string
}

export interface HTTPError extends Error {
  status?: number
  statusText?: string
  response?: Response
}

export interface NetworkError extends Error {
  code?: string
  errno?: number
  syscall?: string
  hostname?: string
}

export interface ValidationError extends Error {
  field?: string
  value?: unknown
  constraint?: string
}

export type ParsedError =
  | APIError
  | HTTPError
  | NetworkError
  | ValidationError
  | Error
