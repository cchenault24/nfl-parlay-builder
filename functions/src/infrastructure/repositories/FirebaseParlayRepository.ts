import * as admin from 'firebase-admin'
import { Parlay } from '../../domain/entities/Parlay'
import { ParlayLeg } from '../../domain/entities/ParlayLeg'
import { ParlayRepository } from '../../domain/repositories/ParlayRepository'

/**
 * Firebase implementation of ParlayRepository
 */
export class FirebaseParlayRepository implements ParlayRepository {
  private db: admin.firestore.Firestore

  constructor() {
    this.db = admin.firestore()
  }

  async save(parlay: Parlay): Promise<void> {
    const parlayData = this.entityToFirestore(parlay)
    await this.db.collection('parlays').doc(parlay.id).set(parlayData)
  }

  async findById(id: string): Promise<Parlay | null> {
    const doc = await this.db.collection('parlays').doc(id).get()
    if (!doc.exists) {
      return null
    }
    return this.firestoreToEntity(doc.data()!, id)
  }

  async findByGameId(gameId: string): Promise<Parlay[]> {
    const snapshot = await this.db
      .collection('parlays')
      .where('gameId', '==', gameId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
  }

  async findByUserId(userId: string): Promise<Parlay[]> {
    const snapshot = await this.db
      .collection('parlays')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Parlay[]> {
    const snapshot = await this.db
      .collection('parlays')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
  }

  async findByProvider(provider: string): Promise<Parlay[]> {
    const snapshot = await this.db
      .collection('parlays')
      .where('metadata.provider', '==', provider)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
  }

  async findByRiskLevel(
    riskLevel: 'low' | 'medium' | 'high'
  ): Promise<Parlay[]> {
    // This would require storing risk level in Firestore
    // For now, we'll get all parlays and filter in memory
    const snapshot = await this.db
      .collection('parlays')
      .orderBy('createdAt', 'desc')
      .get()

    const parlays = snapshot.docs.map(doc =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
    return parlays.filter(parlay => parlay.getRiskLevel() === riskLevel)
  }

  async findByConfidenceRange(
    minConfidence: number,
    maxConfidence: number
  ): Promise<Parlay[]> {
    const snapshot = await this.db
      .collection('parlays')
      .where('overallConfidence', '>=', minConfidence)
      .where('overallConfidence', '<=', maxConfidence)
      .orderBy('overallConfidence', 'desc')
      .get()

    return snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
  }

  async update(parlay: Parlay): Promise<void> {
    const parlayData = this.entityToFirestore(parlay)
    await this.db.collection('parlays').doc(parlay.id).update(parlayData)
  }

  async delete(id: string): Promise<void> {
    await this.db.collection('parlays').doc(id).delete()
  }

  async getStatistics(): Promise<{
    totalParlays: number
    averageConfidence: number
    riskLevelDistribution: Record<string, number>
    providerDistribution: Record<string, number>
    successRate: number
  }> {
    const snapshot = await this.db.collection('parlays').get()
    const parlays = snapshot.docs.map(doc =>
      this.firestoreToEntity(doc.data(), doc.id)
    )

    const totalParlays = parlays.length
    const averageConfidence =
      parlays.reduce((sum, p) => sum + p.overallConfidence, 0) / totalParlays

    const riskLevelDistribution = parlays.reduce(
      (acc, p) => {
        const level = p.getRiskLevel()
        acc[level] = (acc[level] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const providerDistribution = parlays.reduce(
      (acc, p) => {
        const provider = p.metadata?.provider || 'unknown'
        acc[provider] = (acc[provider] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Mock success rate - in real implementation, this would be calculated from actual results
    const successRate = 0.65

    return {
      totalParlays,
      averageConfidence,
      riskLevelDistribution,
      providerDistribution,
      successRate,
    }
  }

  async getGameHistory(gameId: string, limit: number = 10): Promise<Parlay[]> {
    const snapshot = await this.db
      .collection('parlays')
      .where('gameId', '==', gameId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
  }

  async getRecent(limit: number = 10): Promise<Parlay[]> {
    const snapshot = await this.db
      .collection('parlays')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )
  }

  async search(criteria: {
    gameId?: string
    userId?: string
    provider?: string
    riskLevel?: 'low' | 'medium' | 'high'
    minConfidence?: number
    maxConfidence?: number
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<Parlay[]> {
    let query: any = this.db.collection('parlays')

    if (criteria.gameId) {
      query = query.where('gameId', '==', criteria.gameId)
    }

    if (criteria.userId) {
      query = query.where('userId', '==', criteria.userId)
    }

    if (criteria.provider) {
      query = query.where('metadata.provider', '==', criteria.provider)
    }

    if (criteria.minConfidence !== undefined) {
      query = query.where('overallConfidence', '>=', criteria.minConfidence)
    }

    if (criteria.maxConfidence !== undefined) {
      query = query.where('overallConfidence', '<=', criteria.maxConfidence)
    }

    if (criteria.startDate) {
      query = query.where('createdAt', '>=', criteria.startDate)
    }

    if (criteria.endDate) {
      query = query.where('createdAt', '<=', criteria.endDate)
    }

    query = query.orderBy('createdAt', 'desc')

    if (criteria.limit) {
      query = query.limit(criteria.limit)
    }

    if (criteria.offset) {
      query = query.offset(criteria.offset)
    }

    const snapshot = await query.get()
    let parlays = snapshot.docs.map((doc: any) =>
      this.firestoreToEntity(doc.data(), doc.id)
    )

    // Filter by risk level if specified (since it's calculated, not stored)
    if (criteria.riskLevel) {
      parlays = parlays.filter(
        (parlay: any) => parlay.getRiskLevel() === criteria.riskLevel
      )
    }

    return parlays
  }

  /**
   * Convert entity to Firestore document
   */
  private entityToFirestore(parlay: Parlay): any {
    return {
      legs: parlay.legs.map(leg => ({
        id: leg.id,
        betType: leg.betType,
        selection: leg.selection,
        target: leg.target,
        reasoning: leg.reasoning,
        confidence: leg.confidence,
        odds: leg.odds,
        createdAt: leg.createdAt,
        updatedAt: leg.updatedAt,
      })),
      gameContext: parlay.gameContext,
      aiReasoning: parlay.aiReasoning,
      overallConfidence: parlay.overallConfidence,
      estimatedOdds: parlay.estimatedOdds,
      gameId: parlay.gameId,
      gameSummary: parlay.gameSummary,
      metadata: parlay.metadata,
      createdAt: parlay.createdAt,
      updatedAt: parlay.updatedAt,
    }
  }

  /**
   * Convert Firestore document to entity
   */
  private firestoreToEntity(data: any, id: string): Parlay {
    const legs = data.legs.map(
      (legData: any) =>
        new ParlayLeg(
          legData.id,
          legData.betType,
          legData.selection,
          legData.target,
          legData.reasoning,
          legData.confidence,
          legData.odds,
          legData.createdAt?.toDate(),
          legData.updatedAt?.toDate()
        )
    )

    return new Parlay(
      id,
      legs,
      data.gameContext,
      data.aiReasoning,
      data.overallConfidence,
      data.estimatedOdds,
      data.gameId,
      data.gameSummary,
      data.metadata,
      data.createdAt?.toDate(),
      data.updatedAt?.toDate()
    )
  }
}
