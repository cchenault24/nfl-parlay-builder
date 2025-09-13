import { NFLGame, NFLPlayer } from '../types'
import {
  PARLAY_STRATEGIES,
  StrategyConfig,
  VarietyFactors,
} from './parlayStrategies'

export const createSystemPrompt = (strategy: StrategyConfig): string => {
  return `You are an expert NFL betting analyst. Create a 3-leg parlay with clear football reasoning.

STRATEGY: ${strategy.name} (${strategy.description})
CONFIDENCE RANGE: ${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}/10

RULES:
1. Use ONLY players from provided rosters
2. Explain picks with specific football logic (matchups, trends, conditions)  
3. NEVER use strategy names in reasoning - users want football analysis
4. Return valid JSON only
5. Generate exactly 3 different bet types

BET PREFERENCES:
${Object.entries(strategy.betTypeWeights)
  .map(
    ([type, weight]) =>
      `• ${type.replace('_', ' ')}: ${(weight * 100).toFixed(0)}%`
  )
  .join('\n')}`
}

export const createParlayPrompt = (
  game: NFLGame,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[],
  varietyFactors: VarietyFactors
): string => {
  const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

  const getKeyPlayers = (roster: NFLPlayer[]) => ({
    qbs: roster.filter(p => p.position === 'QB').slice(0, 2),
    rbs: roster.filter(p => p.position === 'RB').slice(0, 3),
    wrs: roster.filter(p => p.position === 'WR').slice(0, 4),
    tes: roster.filter(p => p.position === 'TE').slice(0, 2),
  })

  const homeKeyPlayers = getKeyPlayers(homeRoster)
  const awayKeyPlayers = getKeyPlayers(awayRoster)

  return `GAME: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName} (Week ${game.week})

AVAILABLE PLAYERS:
${game.homeTeam.displayName}: ${[
    ...homeKeyPlayers.qbs,
    ...homeKeyPlayers.rbs,
    ...homeKeyPlayers.wrs,
    ...homeKeyPlayers.tes,
  ]
    .map(p => `${p.displayName} (${p.position})`)
    .slice(0, 8)
    .join(', ')}

${game.awayTeam.displayName}: ${[
    ...awayKeyPlayers.qbs,
    ...awayKeyPlayers.rbs,
    ...awayKeyPlayers.wrs,
    ...awayKeyPlayers.tes,
  ]
    .map(p => `${p.displayName} (${p.position})`)
    .slice(0, 8)
    .join(', ')}

Return this exact JSON format:

{
  "legs": [
    {
      "id": "1",
      "betType": "player_prop",
      "selection": "Player Name", 
      "target": "Over 75.5 rushing yards",
      "reasoning": "Specific football explanation why this bet makes sense",
      "confidence": ${strategy.confidenceRange[0]},
      "odds": "-110"
    },
    {
      "id": "2",
      "betType": "spread",
      "selection": "Team Name",
      "target": "-3.5 points", 
      "reasoning": "Football logic for why this team covers",
      "confidence": ${strategy.confidenceRange[1]},
      "odds": "-110"
    },
    {
      "id": "3",
      "betType": "total",
      "selection": "Combined",
      "target": "Under 45.5 points",
      "reasoning": "Why you expect this scoring total",
      "confidence": ${Math.floor((strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2)},
      "odds": "-110"
    }
  ],
  "gameContext": "Week ${game.week} Analysis",
  "aiReasoning": "Brief overall approach",
  "overallConfidence": ${Math.floor((strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2)},
  "estimatedOdds": "+550"
}`
}
