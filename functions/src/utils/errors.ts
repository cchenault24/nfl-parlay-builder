import express from 'express'

// `fields` stays typed for validation errors; the index signature lets an error
// carry the one piece of context that saves the client a follow-up request —
// a quota refusal returning when the quota resets, say.
export type ErrorDetails = {
  fields?: Record<string, string[]>
  [key: string]: unknown
}
export type ErrorBody = {
  code: string
  message: string
  status: number
  correlationId: string
  details?: ErrorDetails
}

export function errorResponse(
  res: express.Response,
  status: number,
  code: string,
  message: string,
  correlationId: string,
  details?: ErrorDetails
) {
  const body: ErrorBody = { code, message, status, correlationId, details }
  return res.status(status).json(body)
}
