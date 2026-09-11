import { useQuery } from '@tanstack/react-query'
import { PregameService } from '../api/PregameService'
import type { BookLines, GameBookLines } from '../types'

const service = new PregameService()

// The server caches the underlying slate for 60s, so this matches it rather
// than re-asking on every screen that mounts.
const STALE_MS = 60_000

export const useWeekOdds = (week: number) =>
  useQuery({
    queryKey: ['odds', 'week', week],
    queryFn: () => service.getWeekOdds(week),
    enabled: week > 0,
    staleTime: STALE_MS,
    gcTime: 5 * STALE_MS,
    // Book lines are a nice-to-have on every screen that shows them: the
    // matchup still renders without them, so a failure must not be retried in
    // the background or surfaced as a broken screen.
    retry: false,
  })

// The lines for one game, or undefined while they are still loading. A game the
// week's response does not mention has no lines from anyone.
export function gameBookLines(
  games: GameBookLines[] | undefined,
  gameId: string
): GameBookLines | undefined {
  return games?.find(g => g.gameId === gameId)
}

// The book a run would actually price this game at, given a preference: the
// chosen one when it has posted, otherwise the first one that has. Mirrors the
// server's fallthrough so the UI can name the book before the run happens.
export function resolveBook(
  books: BookLines[] | undefined,
  preferred: string | undefined
): BookLines | undefined {
  if (!books) {
    return undefined
  }
  const chosen = books.find(b => b.key === preferred && b.posted)
  return chosen ?? books.find(b => b.posted)
}

// Both teams' season stats for one game. Same reasoning as the lines above: the
// screen still renders without them, so a failure must not be retried in the
// background or shown as a broken screen.
export const useGameStats = (gameId: string | undefined) =>
  useQuery({
    queryKey: ['gameStats', gameId],
    queryFn: () => service.getGameStats(gameId as string),
    enabled: !!gameId,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  })
