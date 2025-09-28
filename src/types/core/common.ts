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
