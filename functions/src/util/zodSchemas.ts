// Updated Zod schema for gameId format
import { z } from 'zod'

export const GenerateParlayRequestSchema = z.object({
  gameId: z.string().min(1).trim(),
  options: z
    .object({
      strategy: z.string().optional(),
      variety: z
        .object({
          strategy: z.string().optional(),
          focusArea: z.string().optional(),
          playerTier: z.string().optional(),
          gameScript: z.string().optional(),
          marketBias: z.string().optional(),
        })
        .optional(),
      riskTolerance: z.number().min(0).max(1).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxLegs: z.number().int().min(1).max(10).optional(),
    })
    .optional(),
})
