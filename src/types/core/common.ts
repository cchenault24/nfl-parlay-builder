// ------------------------------------------------------------------------------------------------
// Shared utility types
// ------------------------------------------------------------------------------------------------
export type UUID = string
export type Timestamp = string | Date
export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface BaseEntity {
  id: UUID
  createdAt: Timestamp
  updatedAt?: Timestamp
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}
