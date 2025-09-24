import { Request, Response } from 'express'

export async function currentWeek(req: Request, res: Response) {
  // TODO: replace with real logic
  res.json({ week: 1 })
}

export async function availableWeeks(req: Request, res: Response) {
  // TODO: replace with real logic
  res.json({ weeks: [1, 2, 3] })
}

export async function gamesByWeek(req: Request, res: Response) {
  const weekParam = req.query.week
  const week =
    typeof weekParam === 'string' ? parseInt(weekParam, 10) : Number(weekParam)
  if (!Number.isFinite(week)) {
    res
      .status(400)
      .json({ error: 'Query param "week" is required and must be a number' })
    return
  }
  // TODO: replace with real logic
  res.json({ week, games: [] })
}

export async function teamRoster(req: Request, res: Response) {
  const { gameId } = req.query
  if (!gameId || typeof gameId !== 'string') {
    res.status(400).json({ error: 'Query param "gameId" is required' })
    return
  }
  // TODO: replace with real logic
  res.json({ gameId, roster: [] })
}

export async function getRateLimitStatus(_req: Request, res: Response) {
  // TODO: replace with real logic
  res.json({ remaining: 100, resetSeconds: 60 })
}
