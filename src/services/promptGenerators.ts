import { NFLGame, NFLPlayer } from '../types';
import { StrategyConfig, VarietyFactors, PARLAY_STRATEGIES, getStrategySpecificInstructions } from './parlayStrategies';

export const createSystemPrompt = (strategy: StrategyConfig, varietyFactors: VarietyFactors): string => {
  return `You are an expert NFL betting analyst specializing in "${strategy.name}" parlays.

CURRENT STRATEGY: ${strategy.description}
RISK PROFILE: ${strategy.riskProfile.toUpperCase()}
FOCUS AREA: ${varietyFactors.focusArea.replace('_', ' ').toUpperCase()}
PLAYER PREFERENCE: ${varietyFactors.playerTier.replace('_', ' ').toUpperCase()}
GAME SCRIPT EXPECTATION: ${varietyFactors.gameScript.replace('_', ' ').toUpperCase()}
MARKET APPROACH: ${varietyFactors.marketBias.replace('_', ' ').toUpperCase()}

BET TYPE PREFERENCES (use these weightings):
${Object.entries(strategy.betTypeWeights)
  .map(([type, weight]) => `- ${type.replace('_', ' ')}: ${(weight * 100).toFixed(0)}% preference`)
  .join('\n')}

CONFIDENCE TARGET RANGE: ${strategy.confidenceRange[0]}-${strategy.confidenceRange[1]}/10

STRATEGY-SPECIFIC INSTRUCTIONS:
${getStrategySpecificInstructions(varietyFactors)}

CRITICAL RULES:
1. Generate exactly 3 different bet types for maximum diversification
2. Use ONLY players from the provided current rosters
3. Vary your picks - avoid the same combinations everyone gets
4. Consider the specific strategy and focus area above
5. Target confidence levels within the specified range
6. Return valid JSON only - no markdown or extra text

Your goal is to create a ${strategy.riskProfile}-risk parlay that aligns with the ${strategy.name} approach while maintaining strategic variety.`;
};

export const createParlayPrompt = (
  game: NFLGame, 
  homeRoster: NFLPlayer[], 
  awayRoster: NFLPlayer[], 
  varietyFactors: VarietyFactors
): string => {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000);
  const isRivalry = checkRivalryGame(game.homeTeam.name, game.awayTeam.name);

  // Get key players by position with variety
  const getKeyPlayers = (roster: NFLPlayer[]) => {
    const qbs = roster.filter(p => p.position === 'QB').slice(0, 2);
    const rbs = roster.filter(p => p.position === 'RB').slice(0, 4);
    const wrs = roster.filter(p => p.position === 'WR').slice(0, 6);
    const tes = roster.filter(p => p.position === 'TE').slice(0, 3);

    return { qbs, rbs, wrs, tes };
  };

  const homeKeyPlayers = getKeyPlayers(homeRoster);
  const awayKeyPlayers = getKeyPlayers(awayRoster);

  // Add random elements to prompt
  const randomElements = generateRandomElements();

  return `
STRATEGY-FOCUSED ANALYSIS REQUIRED
Current Strategy: ${PARLAY_STRATEGIES[varietyFactors.strategy].name}
Focus: ${varietyFactors.focusArea} | Players: ${varietyFactors.playerTier} | Script: ${varietyFactors.gameScript}

GAME: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Date: ${new Date(game.date).toLocaleDateString()}
Week: ${game.week} | Season: ${game.season}
${isRivalry ? '🔥 RIVALRY GAME - Expect higher intensity!' : ''}
Analysis ID: ${timestamp}-${randomSeed}

SITUATIONAL FACTORS:
${randomElements.join('\n')}

=== VERIFIED CURRENT ROSTERS (USE ONLY THESE PLAYERS) ===

${game.homeTeam.displayName} ACTIVE ROSTER:
🏈 Quarterbacks: ${homeKeyPlayers.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}
🏃 Running Backs: ${homeKeyPlayers.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}
🙌 Wide Receivers: ${homeKeyPlayers.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}
🎯 Tight Ends: ${homeKeyPlayers.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}

${game.awayTeam.displayName} ACTIVE ROSTER:
🏈 Quarterbacks: ${awayKeyPlayers.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}
🏃 Running Backs: ${awayKeyPlayers.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}
🙌 Wide Receivers: ${awayKeyPlayers.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}
🎯 Tight Ends: ${awayKeyPlayers.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available'}

CREATIVE BETTING OPTIONS TO CONSIDER:
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
5. Target confidence range: ${PARLAY_STRATEGIES[varietyFactors.strategy].confidenceRange[0]}-${PARLAY_STRATEGIES[varietyFactors.strategy].confidenceRange[1]}/10

REQUIRED JSON FORMAT (focus on strategy-appropriate selections):
{
  "legs": [
    {
      "id": "1",
      "betType": "[strategy_appropriate_type]",
      "selection": "[team_or_exact_player_name]",
      "target": "[specific_bet_description]",
      "reasoning": "[strategy_specific_reasoning]",
      "confidence": ${PARLAY_STRATEGIES[varietyFactors.strategy].confidenceRange[0]},
      "odds": "[realistic_odds]"
    }
    // ... 2 more legs
  ],
  "gameContext": "Week ${game.week} ${varietyFactors.strategy} strategy analysis",
  "aiReasoning": "[Strategy-specific explanation of approach]",
  "overallConfidence": ${Math.floor((PARLAY_STRATEGIES[varietyFactors.strategy].confidenceRange[0] + PARLAY_STRATEGIES[varietyFactors.strategy].confidenceRange[1]) / 2)},
  "estimatedOdds": "[calculated_parlay_odds]"
}

Generate exactly 3 UNIQUE legs following your assigned strategy. Avoid common/obvious picks. Be creative within reason.`;
};

const generateRandomElements = (): string[] => {
  return [
    `Weather Factor: ${['Clear', 'Light Rain', 'Windy', 'Cold', 'Dome'][Math.floor(Math.random() * 5)]}`,
    `Public Betting: ${['Heavily on Home', 'Favoring Away', 'Split', 'Avoiding Totals'][Math.floor(Math.random() * 4)]}`,
    `Injury Report: ${['Key players healthy', 'Minor concerns', 'Questionable status'][Math.floor(Math.random() * 3)]}`,
    `Recent Form: ${['Hot streak', 'Inconsistent', 'Struggling', 'Breakout potential'][Math.floor(Math.random() * 4)]}`
  ];
};

const checkRivalryGame = (homeTeam: string, awayTeam: string): boolean => {
  const rivalries = [
    ['Cowboys', 'Eagles'], ['Patriots', 'Jets'], ['Packers', 'Bears'],
    ['Ravens', 'Steelers'], ['Chiefs', 'Raiders'], ['49ers', 'Seahawks'],
  ];

  return rivalries.some(rivalry =>
    (rivalry.includes(homeTeam) && rivalry.includes(awayTeam))
  );
};