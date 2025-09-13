// src/services/promptGenerators.ts
// Enhanced with chain-of-thought reasoning methodology

import { NFLGame, NFLPlayer } from '../types'
import {
  PARLAY_STRATEGIES,
  StrategyConfig,
  VarietyFactors,
} from './parlayStrategies'

// /**
//  * Creates chain-of-thought instructions for analytical reasoning
//  */
// const createChainOfThoughtInstructions = (
//   config?: ChainOfThoughtConfig
// ): string => {
//   if (!config) return '' // If no config, skip chain-of-thought instructions

//   return `
// 🧠 CHAIN-OF-THOUGHT ANALYTICAL PROCESS:

// You MUST follow this step-by-step reasoning process for each bet recommendation:

// STEP 1: DATA GATHERING & ANALYSIS
// - Identify ALL relevant data points from provided rosters, stats, and context
// - Cite specific players, numbers, matchups, and situational factors
// - Note what data is missing or uncertain

// STEP 2: STRATEGIC FRAMEWORK APPLICATION
// - Apply your assigned betting strategy to the available data
// - Explain how this bet fits your strategic approach
// - Consider alternative approaches and why you rejected them

// STEP 3: RISK-REWARD EVALUATION
// - Assess likelihood of success based on data analysis
// - Identify primary risk factors that could cause bet failure
// - Evaluate potential upside vs downside scenarios

// STEP 4: CONFIDENCE CALIBRATION
// - Justify your confidence score with specific reasoning
// - Explain what would make you more/less confident
// - Acknowledge uncertainties and unknown factors

// CRITICAL REQUIREMENTS:
// ✅ Each analytical step MUST cite specific data sources
// ✅ Use exact player names and statistics from provided rosters
// ✅ Acknowledge when data is limited or uncertain
// ✅ Show your logical reasoning process clearly
// ✅ Justify confidence scores with concrete evidence
// ❌ Never make claims without citing supporting data
// ❌ Avoid generic reasoning without specific analysis
// ❌ Don't ignore contradictory evidence or risk factors

// 📊 DATA CITATION REQUIREMENTS:
// For EVERY claim in your reasoning, you MUST cite the specific data source:
// - ROSTER DATA: "Based on current roster: [Player Name] (#[Jersey]) - [Position]"
// - MATCHUP ANALYSIS: "Historical matchup data shows: [Specific stat or trend]"
// - SITUATIONAL FACTORS: "Given [specific situation]: [relevant impact on bet]"
// - STRATEGY ALIGNMENT: "This fits [Strategy Name] because: [specific strategic reasoning]"
// `
// }

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

// // Helper functions
// const generateRandomElements = (): string[] => {
//   return [
//     `Weather Factor: ${['Clear', 'Light Rain', 'Windy', 'Cold', 'Dome'][Math.floor(Math.random() * 5)]}`,
//     `Public Betting: ${['Heavily on Home', 'Favoring Away', 'Split', 'Avoiding Totals'][Math.floor(Math.random() * 4)]}`,
//     `Injury Report: ${['Key players healthy', 'Minor concerns', 'Questionable status'][Math.floor(Math.random() * 3)]}`,
//     `Recent Form: ${['Hot streak', 'Inconsistent', 'Struggling', 'Breakout potential'][Math.floor(Math.random() * 4)]}`,
//   ]
// }

// const checkRivalryGame = (homeTeam: string, awayTeam: string): boolean => {
//   const rivalries = [
//     ['Cowboys', 'Eagles'],
//     ['Patriots', 'Jets'],
//     ['Packers', 'Bears'],
//     ['Ravens', 'Steelers'],
//     ['Chiefs', 'Raiders'],
//     ['49ers', 'Seahawks'],
//   ]

//   return rivalries.some(
//     rivalry => rivalry.includes(homeTeam) && rivalry.includes(awayTeam)
//   )
// }
