/**
 * Base entity class for all domain entities
 * Provides common properties and validation
 */
export abstract class BaseEntity {
  public readonly id: string
  public readonly createdAt: Date
  public readonly updatedAt: Date

  constructor(id: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id
    this.createdAt = createdAt || new Date()
    this.updatedAt = updatedAt || new Date()
  }

  /**
   * Validate the entity
   */
  public abstract validate(): boolean

  /**
   * Check if entity is equal to another
   */
  public equals(other: BaseEntity): boolean {
    return this.id === other.id
  }

  /**
   * Update the updatedAt timestamp
   */
  protected updateTimestamp(): void {
    ;(this as any).updatedAt = new Date()
  }
}
