import { RiskLevelSchema, type AgentRun } from '../agent/shared/schemas'
import type { ScheduleGame } from '../providers/espn/types'
import { SUPPORTED_BOOKMAKERS } from '../providers/odds/client'
import type { EntitlementView } from '../tiering/store'
import type { ErrorDetails } from '../utils/errors'

// Every "can this user create this run" decision, as one pure function. It is
// separate from the route so each refusal can be tested without standing up
// Express, Firestore and an auth token — and so there is exactly one place that
// decides, rather than a chain of early returns the next feature adds to.
//
// I/O stays in the route: the caller loads entitlements and the schedule and
// hands them over.

export interface RunRefusal {
  status: number
  code: string
  message: string
  details?: ErrorDetails
}

export type RunInputResolution =
  | { input: AgentRun['input']; refusal?: undefined }
  | { input?: undefined; refusal: RunRefusal }

export function resolveRunInput(params: {
  body: unknown
  entitlements: EntitlementView
  schedule: ScheduleGame[]
}): RunInputResolution {
  const { entitlements, schedule } = params
  const body = (params.body ?? {}) as Record<string, unknown>
  const { capabilities, tier } = entitlements

  // Always a list, even for one game — see AgentRunSchema. A caller sending a
  // bare `gameId` is refused rather than silently promoted: two spellings of
  // the same field drifting apart is how a client ends up sending something
  // the server stopped reading.
  const gameIds = Array.isArray(body.gameIds)
    ? body.gameIds.map(id => String(id ?? '').trim()).filter(Boolean)
    : []
  const risk = RiskLevelSchema.safeParse(body.riskLevel ?? 'moderate')
  if (gameIds.length === 0 || !risk.success) {
    return refuse(
      400,
      'validation_error',
      'gameIds must be a non-empty array of game ids, and riskLevel must be conservative, moderate, or aggressive'
    )
  }
  if (new Set(gameIds).size !== gameIds.length) {
    return refuse(400, 'validation_error', 'gameIds must not repeat a game')
  }

  if (entitlements.quota.remaining === 0) {
    return refuse(
      403,
      'quota_exhausted',
      `You have used all ${entitlements.quota.limit} generations for this week. Your next ones arrive Tuesday.`,
      { resetsAt: entitlements.quota.resetsAt, tier }
    )
  }
  if (!capabilities.riskLevels.includes(risk.data)) {
    return refuse(403, 'risk_level_locked', `The ${risk.data} risk level is a Pro feature.`, {
      tier,
      allowed: capabilities.riskLevels,
    })
  }

  // Two refusals rather than one because they are two different conversations:
  // a free user is being offered Pro, a Pro user is being told the cap.
  const { maxGamesPerRun } = capabilities
  if (gameIds.length > 1 && maxGamesPerRun < 2) {
    return refuse(
      403,
      'cross_game_locked',
      'Building one parlay across several games is a Pro feature.',
      { tier, maxGamesPerRun }
    )
  }
  if (gameIds.length > maxGamesPerRun) {
    return refuse(403, 'too_many_games', `A parlay can span at most ${maxGamesPerRun} games.`, {
      tier,
      maxGamesPerRun,
    })
  }

  // Every id has to name a real game, and they all have to come from one week.
  // The week is derived rather than sent: a `week` parameter would be a second
  // source of truth the caller could get wrong.
  const byId = new Map(schedule.map(g => [g.gameId, g]))
  const unknownIds = gameIds.filter(id => !byId.has(id))
  if (unknownIds.length > 0) {
    return refuse(400, 'validation_error', `No game found for ${unknownIds.join(', ')}`)
  }
  if (new Set(gameIds.map(id => byId.get(id)?.week)).size > 1) {
    return refuse(
      400,
      'validation_error',
      'Every game in one parlay must come from the same week.'
    )
  }

  const legs = capabilities.legCount
  const requestedLegs =
    body.legCount === undefined ? legs.default : Number(body.legCount)
  if (
    !Number.isInteger(requestedLegs) ||
    requestedLegs < legs.min ||
    requestedLegs > legs.max
  ) {
    return refuse(
      403,
      'leg_count_locked',
      legs.min === legs.max
        ? `Parlays are ${legs.min} legs on your plan. Choosing a leg count is a Pro feature.`
        : `Leg count must be between ${legs.min} and ${legs.max}.`,
      { tier, allowed: legs }
    )
  }

  // An unset bookmaker is the norm — it means "no preference", and the odds
  // client falls through its default priority. Only a rejected *choice* is an
  // error, so a plan that cannot choose simply has the field dropped rather
  // than being refused for sending a default it never picked.
  const requestedBook = body.bookmaker ? String(body.bookmaker) : undefined
  if (requestedBook && !capabilities.chooseSportsbook) {
    return refuse(403, 'sportsbook_locked', 'Choosing your sportsbook is a Pro feature.', {
      tier,
    })
  }
  if (requestedBook && !SUPPORTED_BOOKMAKERS.some(b => b.key === requestedBook)) {
    return refuse(
      400,
      'validation_error',
      `bookmaker must be one of ${SUPPORTED_BOOKMAKERS.map(b => b.key).join(', ')}`
    )
  }

  return {
    input: {
      gameIds,
      riskLevel: risk.data,
      // Snapshotted now rather than re-read mid-run: a tier that changes while
      // the agent is drafting would otherwise have the draft prompted for one
      // shape and validated against another.
      legCount: requestedLegs,
      playerProps: capabilities.playerProps,
      ...(requestedBook ? { bookmaker: requestedBook } : {}),
    },
  }
}

function refuse(
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails
): RunInputResolution {
  return { refusal: { status, code, message, details } }
}
