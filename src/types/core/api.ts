// ------------------------------------------------------------------------------------------------
// src/types/core/api.ts - Base API types (consolidating all API patterns)
// ------------------------------------------------------------------------------------------------
export interface APIConfig {
  baseURL: string
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
}

export interface APIResponse<T = unknown> {
  data: T
  status: number
  headers?: Record<string, string>
}

export interface APIErrorResponse {
  message?: string
  error?: string
  status?: number
  code?: string
  details?: Record<string, string | number | boolean>
}

export interface APIRequestConfig {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined | null>
  timeoutMs?: number
  signal?: AbortSignal
}

export type APIRequestData =
  | Record<string, unknown>
  | FormData
  | ArrayBuffer
  | Blob
  | string
  | Uint8Array
  | undefined
