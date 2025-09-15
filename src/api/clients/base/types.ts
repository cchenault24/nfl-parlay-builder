export interface APIConfig {
  baseURL: string
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
}

export type APIResponse<T> = {
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

export interface IAPIClient {
  get<T>(endpoint: string, config?: APIRequestConfig): Promise<APIResponse<T>>
  post<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  put<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  patch<T>(
    endpoint: string,
    data?: APIRequestData,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
  delete<T>(
    endpoint: string,
    config?: APIRequestConfig
  ): Promise<APIResponse<T>>
}

export class HTTPError<T = unknown> extends Error {
  public readonly status: number
  public readonly body: T | undefined
  constructor(message: string, status: number, body?: T) {
    super(message)
    this.name = 'HTTPError'
    this.status = status
    this.body = body
  }
}
