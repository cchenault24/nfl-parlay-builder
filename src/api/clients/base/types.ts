export interface APIConfig {
  baseURL: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface APIResponse<T> {
  data: T
  status: number
  headers?: Record<string, string>
}

export interface APIRequestConfig {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
}
