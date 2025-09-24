import * as functions from 'firebase-functions'
import { handleWithCors } from './http/cors'
import {
  availableWeeks as availableWeeksRoute,
  currentWeek as currentWeekRoute,
  gamesByWeek as gamesByWeekRoute,
  getRateLimitStatus as getRateLimitStatusRoute,
  teamRoster as teamRosterRoute,
} from './http/routes'

// One export per endpoint, each with CORS + OPTIONS preflight handling

export const currentWeek = functions.https.onRequest(
  handleWithCors((req, res) => currentWeekRoute(req, res))
)

export const availableWeeks = functions.https.onRequest(
  handleWithCors((req, res) => availableWeeksRoute(req, res))
)

export const gamesByWeek = functions.https.onRequest(
  handleWithCors((req, res) => gamesByWeekRoute(req, res))
)

export const teamRoster = functions.https.onRequest(
  handleWithCors((req, res) => teamRosterRoute(req, res))
)

export const getRateLimitStatus = functions.https.onRequest(
  handleWithCors((req, res) => getRateLimitStatusRoute(req, res))
)
