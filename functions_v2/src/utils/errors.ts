import express from 'express'

export type ErrorDetails = { fields?: Record<string, string[]> }
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
