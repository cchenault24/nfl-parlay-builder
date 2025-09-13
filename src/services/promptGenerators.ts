// src/services/promptGenerators.ts
// Enhanced with chain-of-thought reasoning methodology

import { NFLGame, NFLPlayer } from '../types'
import { ChainOfThoughtConfig } from '../types/reasoning'
import {
  PARLAY_STRATEGIES,
  StrategyConfig,
  VarietyFactors,
  getStrategySpecificInstructions,
} from './parlayStrategies'

/**
 * Creates chain-of-thought instructions for analytical reasoning
 */
const createChainOfThoughtInstructions = (
  config?: ChainOfThoughtConfig
): string => {
  if (!config) return '' // If no config, skip chain-of-thought instructions

  return `
🧠 CHAIN-OF-THOUGHT ANALYTICAL PROCESS:

You MUST follow this step-by-step reasoning process for each bet recommendation:

STEP 1: DATA GATHERING & ANALYSIS
- Identify ALL relevant data points from provided rosters, stats, and context
- Cite specific players, numbers, matchups, and situational factors
- Note what data is missing or uncertain

STEP 2: STRATEGIC FRAMEWORK APPLICATION  
- Apply your assigned betting strategy to the available data
- Explain how this bet fits your strategic approach
- Consider alternative approaches and why you rejected them

STEP 3: RISK-REWARD EVALUATION
- Assess likelihood of success based on data analysis
- Identify primary risk factors that could cause bet failure
- Evaluate potential upside vs downside scenarios

STEP 4: CONFIDENCE CALIBRATION
- Justify your confidence score with specific reasoning
- Explain what would make you more/less confident
- Acknowledge uncertainties and unknown factors

CRITICAL REQUIREMENTS:
✅ Each analytical step MUST cite specific data sources
✅ Use exact player names and statistics from provided rosters
✅ Acknowledge when data is limited or uncertain
✅ Show your logical reasoning process clearly
✅ Justify confidence scores with concrete evidence
❌ Never make claims without citing supporting data
❌ Avoid generic reasoning without specific analysis
❌ Don't ignore contradictory evidence or risk factors

📊 DATA CITATION REQUIREMENTS:
For EVERY claim in your reasoning, you MUST cite the specific data source:
- ROSTER DATA: "Based on current roster: [Player Name] (#[Jersey]) - [Position]"
- MATCHUP ANALYSIS: "Historical matchup data shows: [Specific stat or trend]"  
- SITUATIONAL FACTORS: "Given [specific situation]: [relevant impact on bet]"
- STRATEGY ALIGNMENT: "This fits [Strategy Name] because: [specific strategic reasoning]"
`
}

export const createSystemPrompt = (
  strategy: StrategyConfig,
  varietyFactors: VarietyFactors,
  config?: ChainOfThoughtConfig
): string => {
  const chainOfThoughtInstructions = config
    ? createChainOfThoughtInstructions(config)
    : ''

  return `You are an expert NFL betting analyst specializing in "${strategy.name}" parlays${config ? ' with advanced analytical reasoning capabilities' : ''}.

${chainOfThoughtInstructions}

CURRENT STRATEGY PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 STRATEGY: ${strategy.description}
📊 RISK PROFILE: ${strategy.riskProfile.toUpperCase()}
🎲 CONFIDENCE RANGE: ${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}/10

FOCUS PARAMETERS:
• AREA: ${varietyFactors.focusArea.replace('_', ' ').toUpperCase()}
• PLAYERS: ${varietyFactors.playerTier.replace('_', ' ').toUpperCase()}
• GAME SCRIPT: ${varietyFactors.gameScript.replace('_', ' ').toUpperCase()}
• MARKET APPROACH: ${varietyFactors.marketBias.replace('_', ' ').toUpperCase()}

BET TYPE PREFERENCES:
${Object.entries(strategy.betTypeWeights)
  .map(
    ([type, weight]) =>
      `• ${type.replace('_', ' ')}: ${(weight * 100).toFixed(0)}% weighting`
  )
  .join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRATEGY-SPECIFIC INSTRUCTIONS:
${getStrategySpecificInstructions(varietyFactors)}

CRITICAL SUCCESS FACTORS:
1. ${config ? 'Show detailed analytical thinking for each recommendation' : 'Provide clear reasoning for each bet'}
2. Use ONLY verified current roster data (exact names and positions)
3. ${config ? 'Provide specific justifications for confidence scores' : 'Target confidence levels within your assigned range'}
4. Generate exactly 3 different bet types for maximum diversification
5. Vary your picks - avoid the same combinations everyone gets
6. ${config ? 'Acknowledge limitations and uncertainties honestly' : 'Return valid JSON only - no markdown or extra text'}
7. Target confidence levels within your assigned range: ${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}/10

Your goal is to create a ${strategy.riskProfile}-risk parlay that aligns with the ${strategy.name} approach while maintaining strategic variety.`
}

export const createParlayPrompt = (
  game: NFLGame,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[],
  varietyFactors: VarietyFactors,
  config?: ChainOfThoughtConfig
): string => {
  const timestamp = Date.now()
  const randomSeed = Math.floor(Math.random() * 1000)
  const isRivalry = checkRivalryGame(game.homeTeam.name, game.awayTeam.name)
  const strategy = PARLAY_STRATEGIES[varietyFactors.strategy]

  // Get key players by position with variety
  const getKeyPlayers = (roster: NFLPlayer[]) => {
    const qbs = roster.filter(p => p.position === 'QB').slice(0, 2)
    const rbs = roster.filter(p => p.position === 'RB').slice(0, 4)
    const wrs = roster.filter(p => p.position === 'WR').slice(0, 6)
    const tes = roster.filter(p => p.position === 'TE').slice(0, 3)

    return { qbs, rbs, wrs, tes }
  }

  const homeKeyPlayers = getKeyPlayers(homeRoster)
  const awayKeyPlayers = getKeyPlayers(awayRoster)

  // Add random elements to prompt for variety
  const randomElements = generateRandomElements()

  // Create enhanced JSON format if chain-of-thought is enabled
  const createJSONFormat = () => {
    if (!config) {
      // Original simple format
      return `{
  "legs": [
    {
      "id": "1",
      "betType": "[strategy_appropriate_type]",
      "selection": "[team_or_exact_player_name]",
      "target": "[specific_bet_description]",
      "reasoning": "[strategy_specific_reasoning]",
      "confidence": ${strategy.confidenceRange[0]},
      "odds": "[realistic_odds]"
    }
    // ... 2 more legs
  ],
  "gameContext": "Week ${game.week} ${varietyFactors.strategy} strategy analysis",
  "aiReasoning": "[Strategy-specific explanation of approach]",
  "overallConfidence": ${Math.floor((strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2)},
  "estimatedOdds": "[calculated_parlay_odds]"
}`
    }

    // Enhanced format with chain-of-thought
    return `{
  "legs": [
    {
      "id": "leg-1",
      "betType": "[spread|total|moneyline|player_prop]",
      "selection": "[exact_team_or_player_name_from_roster]",
      "target": "[specific_bet_description_with_numbers]",
      "chainOfThoughtReasoning": {
        "analyticalSteps": [
          {
            "step": 1,
            "description": "Data Gathering & Initial Analysis",
            "reasoning": "[specific analysis with data citations]",
            "dataSource": "[roster_data|matchup_analysis|situational_factors]",
            "conclusion": "[what this step determined]"
          },
          {
            "step": 2,
            "description": "Strategic Framework Application", 
            "reasoning": "[how this fits the betting strategy]",
            "dataSource": "[supporting evidence]",
            "conclusion": "[strategic rationale]"
          },
          {
            "step": 3,
            "description": "Risk-Reward Evaluation",
            "reasoning": "[likelihood assessment with specific factors]",
            "dataSource": "[risk assessment data]", 
            "conclusion": "[risk vs reward conclusion]"
          },
          {
            "step": 4,
            "description": "Confidence Calibration",
            "reasoning": "[specific justification for confidence score]",
            "dataSource": "[confidence-supporting evidence]",
            "conclusion": "[final confidence determination]"
          }
        ],
        "keyDataPoints": [
          {
            "source": "[roster_data|matchup_analysis|situational_factors]",
            "specificData": "[exact data point referenced]", 
            "relevance": "[why this matters for the bet]"
          }
        ],
        "strategicRationale": "[how this bet fits your overall strategy]",
        "riskAssessment": {
          "likelihood": "[very_low|low|medium|high|very_high]",
          "primaryRisks": ["[specific risk 1]", "[specific risk 2]"],
          "mitigation": "[why you still recommend despite risks]"
        },
        "confidenceBreakdown": {
          "score": [${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}],
          "primaryFactors": ["[main supporting factor 1]", "[main supporting factor 2]"],
          "riskFactors": ["[concern 1]", "[concern 2]"],
          "uncertainties": ["[unknown factor 1]", "[unknown factor 2]"]
        }
      },
      "reasoning": "[2-3 sentence summary for UI display]",
      "confidence": [${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}],
      "odds": "[realistic_american_odds]"
    }
    // ... repeat for legs 2 and 3 with DIFFERENT bet types  
  ],
  "parlayChainOfThought": {
    "strategicApproach": "[overall analytical methodology explanation]",
    "legSynergies": ["[how legs work together or independently]"],
    "overallRiskProfile": "[combined risk assessment of all three legs]",
    "scenarioAnalysis": {
      "bestCase": "[if everything goes right]", 
      "worstCase": "[if everything goes wrong]",
      "mostLikely": "[most probable outcome]"
    },
    "confidenceCalibration": {
      "overallScore": [1-10],
      "keyAssumptions": ["[critical assumption 1]", "[critical assumption 2]"]
    }
  },
  "gameContext": "Week ${game.week} ${strategy.name} Analysis",
  "aiReasoning": "[brief strategy explanation for UI]", 
  "overallConfidence": [${Math.floor((strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2)}],
  "estimatedOdds": "[calculated_parlay_odds]"
}`
  }

  return `${config ? 'ANALYTICAL MISSION: Create a 3-leg parlay using chain-of-thought reasoning.' : 'STRATEGY-FOCUSED ANALYSIS REQUIRED'}

GAME CONTEXT & INITIAL DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 ${game.awayTeam.displayName} @ ${game.homeTeam.displayName} | Week ${game.week}
🔍 Analysis ID: ${timestamp}-${randomSeed}
🎯 Strategy: ${strategy.name} (${strategy.description})
${isRivalry ? '🔥 RIVALRY GAME - Expect higher intensity!' : ''}

SITUATIONAL ANALYSIS FACTORS:
${randomElements.join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VERIFIED CURRENT ROSTERS (${config ? 'MANDATORY DATA SOURCE' : 'USE ONLY THESE PLAYERS'}):

${game.homeTeam.displayName} ACTIVE ROSTER:
${homeKeyPlayers.qbs.length > 0 ? `🏈 QBs: ${homeKeyPlayers.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🏈 QBs: No data available'}
${homeKeyPlayers.rbs.length > 0 ? `🏃 RBs: ${homeKeyPlayers.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🏃 RBs: No data available'}
${homeKeyPlayers.wrs.length > 0 ? `🙌 WRs: ${homeKeyPlayers.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🙌 WRs: No data available'}
${homeKeyPlayers.tes.length > 0 ? `🎯 TEs: ${homeKeyPlayers.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🎯 TEs: No data available'}

${game.awayTeam.displayName} ACTIVE ROSTER:
${awayKeyPlayers.qbs.length > 0 ? `🏈 QBs: ${awayKeyPlayers.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🏈 QBs: No data available'}
${awayKeyPlayers.rbs.length > 0 ? `🏃 RBs: ${awayKeyPlayers.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🏃 RBs: No data available'}
${awayKeyPlayers.wrs.length > 0 ? `🙌 WRs: ${awayKeyPlayers.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🙌 WRs: No data available'}
${awayKeyPlayers.tes.length > 0 ? `🎯 TEs: ${awayKeyPlayers.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}` : '🎯 TEs: No data available'}

${
  config
    ? `ANALYTICAL REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MINIMUM 4 analytical steps per bet recommendation
✅ MANDATORY data citations for all claims  
✅ COMPREHENSIVE confidence justification with risk factors
✅ Acknowledge uncertainties and data limitations
✅ Strategic alignment with ${strategy.name} methodology
✅ Unique, non-obvious bet selections with variety`
    : `CREATIVE BETTING OPTIONS TO CONSIDER:
- Alternative spreads (+/- 1.5, 2.5, 6.5, 10.5)
- Multiple total ranges (O/U 38.5, 42.5, 47.5, 52.5)
- Player prop varieties: Rush attempts, completions, longest completion, TDs
- Team props: First to score, largest lead, time of possession
- Combo props: Player TD + team win, QB yards + team total

⚠️ VARIETY REQUIREMENTS:
1. Make each parlay UNIQUE - avoid repetitive combinations
2. Consider lesser-known but valuable props  
3. Mix conservative and bold selections based on strategy
4. Use exact player names from rosters above only
5. Target confidence range: ${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}/10`
}

REQUIRED JSON OUTPUT FORMAT:
${createJSONFormat()}

${config ? 'Generate exactly 3 unique legs using the chain-of-thought methodology. Each leg must demonstrate clear analytical reasoning with specific data citations. Avoid obvious/popular picks - find value through deep analysis.' : 'Generate exactly 3 UNIQUE legs following your assigned strategy. Avoid common/obvious picks.'}
`
}

// Helper functions
const generateRandomElements = (): string[] => {
  return [
    `Weather Factor: ${['Clear', 'Light Rain', 'Windy', 'Cold', 'Dome'][Math.floor(Math.random() * 5)]}`,
    `Public Betting: ${['Heavily on Home', 'Favoring Away', 'Split', 'Avoiding Totals'][Math.floor(Math.random() * 4)]}`,
    `Injury Report: ${['Key players healthy', 'Minor concerns', 'Questionable status'][Math.floor(Math.random() * 3)]}`,
    `Recent Form: ${['Hot streak', 'Inconsistent', 'Struggling', 'Breakout potential'][Math.floor(Math.random() * 4)]}`,
  ]
}

const checkRivalryGame = (homeTeam: string, awayTeam: string): boolean => {
  const rivalries = [
    ['Cowboys', 'Eagles'],
    ['Patriots', 'Jets'],
    ['Packers', 'Bears'],
    ['Ravens', 'Steelers'],
    ['Chiefs', 'Raiders'],
    ['49ers', 'Seahawks'],
  ]

  return rivalries.some(
    rivalry => rivalry.includes(homeTeam) && rivalry.includes(awayTeam)
  )
}
