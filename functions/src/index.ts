// v2 HTTPS functions aggregator — no server start here
// Ensure each imported module exports an onRequest handler.

import { availableWeeks } from './http/availableWeeks'
import { currentWeek } from './http/currentWeek'
import { gamesByWeek } from './http/gamesByWeek'
import { generateParlay } from './http/generateParlay'
import { getRateLimitStatus } from './http/getRateLimitStatus'
import { teamRoster } from './http/teamRoster'

// Re-export named functions so Firebase can discover them.
export {
  availableWeeks,
  currentWeek,
  gamesByWeek,
  generateParlay,
  getRateLimitStatus,
  teamRoster,
}
