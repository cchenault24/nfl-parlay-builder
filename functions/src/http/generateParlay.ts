import type { GenerateParlayResponse, ParlayOptions } from '@npb/shared'
import cors from 'cors'
import * as functions from 'firebase-functions/v1'
import { DataOrchestrator } from '../service/data/dataOrchestrator'
// REPLACE this:
// import ParlayAIService from "../service/ai/ParlayAIService"
// WITH this:
import StubAIService from '../service/ai/StubAIService'
import { validateGenerateParlayRequest } from '../util/validate'

const handleCors = cors({ origin: true })

export const generateParlay = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
    secrets: ['OPENAI_API_KEY'],
  })
  .https.onRequest(async (req, res) => {
    handleCors(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' },
        } as GenerateParlayResponse)
        return
      }

      const parsed = validateGenerateParlayRequest(req.body)
      if (!parsed.ok) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: parsed.error },
        } as GenerateParlayResponse)
        return
      }

      const { gameId, options } = parsed.data

      try {
        const orchestrator = new DataOrchestrator()
        const unified = await orchestrator.byGameId(gameId)

        // Use stub for now; we’ll swap to real provider after migration
        const ai = new StubAIService()
        const genOpts: ParlayOptions = options ?? {}
        const result = await ai.generateParlay(
          unified.game,
          unified.rosters,
          genOpts
        )

        res.status(200).json({
          success: true,
          data: result.parlay,
        } as GenerateParlayResponse)
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: err?.message ?? 'Unknown error',
          },
        } as GenerateParlayResponse)
      }
    })
  })
