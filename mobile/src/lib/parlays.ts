import type { GeneratedParlay, ParlayLeg } from '@shared/types'
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'

// Firestore rules require userId, gameId, legs and a server-set createdAt.
export const saveParlayToUser = async (userId: string, parlay: GeneratedParlay) => {
  const ref = await addDoc(collection(db, 'parlays'), {
    ...parlay,
    userId,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

type StoredLeg = Partial<ParlayLeg> & { type?: ParlayLeg['betType']; pick?: string }
type StoredParlay = Partial<Omit<GeneratedParlay, 'legs'>> & {
  legs?: StoredLeg[]
  estimatedOdds?: number | string
  createdAt?: Timestamp
  savedAt?: Timestamp
}

// Older saves used different field names; normalize so history always renders.
// `parlayId` here is always the Firestore doc id, not the stored field — the
// same generated parlay (same runId) saved twice would otherwise carry the
// same `parlayId` in both docs, breaking list identity in history.
//
// NOTE: this mirrors the web client's normalizeParlay in src/config/firebase.ts.
// Kept duplicated rather than moved to shared/ per the rule-of-three; if a
// third caller appears, or these drift, extract it.
function normalizeParlay(data: StoredParlay, docId: string): GeneratedParlay {
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  return {
    parlayId: docId,
    gameId: data.gameId ?? '',
    gameContext: data.gameContext ?? '',
    week: typeof data.week === 'number' ? data.week : 0,
    gameDateTime: data.gameDateTime ?? '',
    legs: (data.legs ?? []).map(leg => ({
      betType: leg.betType ?? leg.type ?? 'moneyline',
      team: leg.team ?? '',
      player: leg.player?.trim() ? leg.player : null,
      selection: leg.selection ?? leg.pick ?? '',
      line: leg.line ?? null,
      side: leg.side ?? null,
      odds: num(leg.odds),
      confidence: num(leg.confidence),
      reasoning: leg.reasoning ?? '',
      // Saves from before this field existed were made under the old
      // all-or-nothing anchoring rule, so every leg they contain was, by
      // definition, anchored.
      anchored: leg.anchored ?? true,
    })),
    combinedOdds: num(data.combinedOdds ?? data.estimatedOdds),
    parlayConfidence: num(data.parlayConfidence),
    gameSummary: data.gameSummary ?? {
      matchupSummary: '',
      keyFactors: [],
      gamePrediction: {
        winner: '',
        projectedScore: { home: 0, away: 0 },
        winProbability: 0,
      },
    },
    model: data.model ?? 'unknown',
    grading: data.grading,
  }
}

export const getUserParlays = (
  userId: string,
  callback: (parlays: GeneratedParlay[]) => void,
  onError: (message: string) => void
) =>
  onSnapshot(
    query(collection(db, 'parlays'), where('userId', '==', userId)),
    snapshot => {
      const savedAtMs = (d: StoredParlay) =>
        (d.createdAt ?? d.savedAt)?.toMillis?.() ?? 0
      const parlays = snapshot.docs
        .map(docSnap => ({ data: docSnap.data() as StoredParlay, id: docSnap.id }))
        .sort((a, b) => savedAtMs(b.data) - savedAtMs(a.data))
        .map(({ data, id }) => normalizeParlay(data, id))
      callback(parlays)
    },
    // Web logs and returns an empty list here, which is indistinguishable from
    // "no saved parlays". Surface it instead.
    error => onError(error.message)
  )
