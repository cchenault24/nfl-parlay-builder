import OpenAI from 'openai';
import { fetchGameRosters } from './nflData';
import { GeneratedParlay, NFLGame, NFLPlayer, ParlayLeg } from '../types';
import { ROSTER_LIMITS, NFL_RIVALRIES, ODDS_RANGES, DEFAULTS, API_CONFIG } from '../config/constants';
import { getEnvVar } from '../utils';

const openai = new OpenAI({
  apiKey: getEnvVar('VITE_OPENAI_API_KEY'),
  dangerouslyAllowBrowser: true,
});

// Helper Functions
const getKeyPlayers = (roster: NFLPlayer[]) => ({
  qbs: roster.filter(p => p.position === 'QB').slice(0, ROSTER_LIMITS.QB),
  rbs: roster.filter(p => p.position === 'RB').slice(0, ROSTER_LIMITS.RB),
  wrs: roster.filter(p => p.position === 'WR').slice(0, ROSTER_LIMITS.WR),
  tes: roster.filter(p => p.position === 'TE').slice(0, ROSTER_LIMITS.TE)
});

const checkRivalryGame = (homeTeam: string, awayTeam: string): boolean => {
  return NFL_RIVALRIES.some(rivalry =>
    rivalry.includes(homeTeam) && rivalry.includes(awayTeam)
  );
};

const formatPlayerList = (players: NFLPlayer[]) => 
  players.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None available';

const createSystemPrompt = () => `
You are an expert NFL betting analyst with 10+ years of experience. You specialize in creating profitable parlay combinations by analyzing team matchups, player performance trends, and situational factors.

CRITICAL RULES:
1. Generate exactly 3 different bet types for maximum diversification
2. Use ONLY players from the provided current rosters
3. Provide realistic odds based on current market standards
4. Focus on high-confidence bets with solid reasoning
5. Return valid JSON only - no markdown or extra text

Your goal is to create a well-balanced parlay that maximizes value while maintaining reasonable probability of success.`;

const createGameContext = (game: NFLGame) => {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000);
  const isRivalry = checkRivalryGame(game.homeTeam.name, game.awayTeam.name);
  
  return `
CRITICAL: You are analyzing a live NFL game with CURRENT 2024-2025 season rosters. 
Use ONLY the players listed below - DO NOT use any player names from memory or training data.

GAME: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Date: ${new Date(game.date).toLocaleDateString()}
Week: ${game.week} | Season: ${game.season}
${isRivalry ? 'RIVALRY GAME - Expect higher intensity and unpredictable plays!' : ''}
Analysis ID: ${timestamp}-${randomSeed}
`;
};

const createRosterSection = (game: NFLGame, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]) => {
  const homeKeyPlayers = getKeyPlayers(homeRoster);
  const awayKeyPlayers = getKeyPlayers(awayRoster);
  
  return `
=== VERIFIED CURRENT ROSTERS (USE ONLY THESE PLAYERS) ===

${game.homeTeam.displayName} ACTIVE ROSTER:
Quarterbacks: ${formatPlayerList(homeKeyPlayers.qbs)}
Running Backs: ${formatPlayerList(homeKeyPlayers.rbs)}
Wide Receivers: ${formatPlayerList(homeKeyPlayers.wrs)}
Tight Ends: ${formatPlayerList(homeKeyPlayers.tes)}

${game.awayTeam.displayName} ACTIVE ROSTER:
Quarterbacks: ${formatPlayerList(awayKeyPlayers.qbs)}
Running Backs: ${formatPlayerList(awayKeyPlayers.rbs)}
Wide Receivers: ${formatPlayerList(awayKeyPlayers.wrs)}
Tight Ends: ${formatPlayerList(awayKeyPlayers.tes)}
`;
};

const createBettingGuidelines = (game: NFLGame) => `
MANDATORY RULES:
1. For player props, use EXACT player names from the rosters above
2. DO NOT use players like "Saquon Barkley" if not listed above
3. DO NOT use players from previous seasons or other teams
4. If a position group is empty, focus on other bet types
5. Verify each player name matches the roster exactly

BETTING OPTIONS:
- Spread: ${game.homeTeam.displayName} vs ${game.awayTeam.displayName}
- Total Points: Over/Under game total
- Moneyline: Straight up winner
- Player Props: ONLY from verified rosters above

REALISTIC ODDS:
- Spread: ${ODDS_RANGES.SPREAD}
- Totals: ${ODDS_RANGES.TOTALS}
- Moneyline: ${ODDS_RANGES.MONEYLINE}
- Player Props: ${ODDS_RANGES.PLAYER_PROPS}
`;

const createJSONFormat = (game: NFLGame) => `
REQUIRED JSON FORMAT:
{
  "legs": [
    {
      "id": "1",
      "betType": "spread",
      "selection": "${game.homeTeam.displayName}",
      "target": "${game.homeTeam.displayName} -3.5",
      "reasoning": "Home field advantage with strong rushing attack",
      "confidence": 7,
      "odds": "-110"
    },
    {
      "id": "2",
      "betType": "player_prop",
      "selection": "[EXACT_NAME_FROM_ROSTER_ABOVE]",
      "target": "[EXACT_NAME] (${game.homeTeam.displayName}) - Over 75.5 Receiving Yards",
      "reasoning": "High target share against weak secondary",
      "confidence": 8,
      "odds": "-115"
    },
    {
      "id": "3",
      "betType": "total",
      "selection": "Over",
      "target": "Over 45.5 Total Points",
      "reasoning": "Both offenses trending upward",
      "confidence": 6,
      "odds": "-105"
    }
  ],
  "gameContext": "Week ${game.week} matchup analysis",
  "aiReasoning": "Balanced approach mixing team performance with individual player matchups",
  "overallConfidence": 7,
  "estimatedOdds": "+575"
}

Generate exactly 3 different bet types. Use current verified rosters only. Return valid JSON.`;

const createParlayPrompt = (game: NFLGame, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): string => {
  return [
    createGameContext(game),
    createRosterSection(game, homeRoster, awayRoster),
    createBettingGuidelines(game),
    createJSONFormat(game)
  ].join('\n');
};

const validatePlayerProp = (leg: any, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): boolean => {
  if (leg.betType !== 'player_prop') return true;

  const allPlayers = [...homeRoster, ...awayRoster];
  const playerNames = allPlayers.map(p => p.displayName.toLowerCase());
  const legPlayerName = leg.selection?.toLowerCase() || '';

  return playerNames.some(name =>
    name.includes(legPlayerName) || legPlayerName.includes(name)
  );
};

const calculateParlayOdds = (individualOdds: string[]): string => {
  try {
    const decimalOdds = individualOdds.map(odds => {
      const num = parseInt(odds);
      return num > 0 ? (num / 100) + 1 : (100 / Math.abs(num)) + 1;
    });

    const combinedDecimal = decimalOdds.reduce((acc, odds) => acc * odds, 1);
    return combinedDecimal >= 2 ?
      `+${Math.round((combinedDecimal - 1) * 100)}` :
      `-${Math.round(100 / (combinedDecimal - 1))}`;
  } catch {
    return '+550';
  }
};

const createFallbackParlay = (game: NFLGame): GeneratedParlay => {
  const isHomeFavorite = Math.random() > 0.4;
  const spread = (Math.random() * 6 + 1).toFixed(1);
  const total = (Math.random() * 10 + 42).toFixed(1);

  return {
    id: `fallback-${Date.now()}`,
    legs: [
      {
        id: 'fallback-1',
        betType: 'spread',
        selection: isHomeFavorite ? game.homeTeam.displayName : game.awayTeam.displayName,
        target: `${isHomeFavorite ? game.homeTeam.displayName : game.awayTeam.displayName} ${isHomeFavorite ? '-' : '+'}${spread}`,
        reasoning: `${isHomeFavorite ? 'Home field advantage' : 'Road team value'} with strong recent form and favorable matchup.`,
        confidence: 7,
        odds: DEFAULTS.DEFAULT_ODDS,
      },
      {
        id: 'fallback-2',
        betType: 'total',
        selection: Math.random() > 0.5 ? 'Over' : 'Under',
        target: `${Math.random() > 0.5 ? 'Over' : 'Under'} ${total} Total Points`,
        reasoning: 'Both teams show consistent scoring trends that support this total based on pace and efficiency.',
        confidence: 6,
        odds: '-105',
      },
      {
        id: 'fallback-3',
        betType: 'player_prop',
        selection: 'Starting QB',
        target: 'Starting QB Over 250.5 Passing Yards',
        reasoning: 'Expected game script favors passing attack with solid matchup against opposing secondary.',
        confidence: 6,
        odds: '-115',
      },
    ],
    gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - Week ${game.week}`,
    aiReasoning: 'Balanced fallback parlay combining spread value, total points analysis, and quarterback performance.',
    overallConfidence: 6,
    estimatedOdds: DEFAULTS.FALLBACK_ODDS,
    createdAt: new Date().toISOString(),
  };
};

const parseAIResponse = (response: string, game: NFLGame, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): GeneratedParlay => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.legs || !Array.isArray(parsed.legs) || parsed.legs.length !== 3) {
      throw new Error('Invalid parlay structure from AI');
    }

    const validLegs = parsed.legs.filter((leg: any) => validatePlayerProp(leg, homeRoster, awayRoster));

    // Add safe alternatives if needed
    while (validLegs.length < 3) {
      const safeAlternative = {
        id: `safe-${validLegs.length + 1}`,
        betType: validLegs.length % 2 === 0 ? 'total' : 'spread',
        selection: validLegs.length % 2 === 0 ? 'Over' : game.homeTeam.displayName,
        target: validLegs.length % 2 === 0 ?
          `Over ${(Math.random() * 10 + 42).toFixed(1)} Total Points` :
          `${game.homeTeam.displayName} -${(Math.random() * 6 + 1).toFixed(1)}`,
        reasoning: validLegs.length % 2 === 0 ?
          'Safe total points bet based on team tendencies' :
          'Home field advantage analysis',
        confidence: DEFAULTS.DEFAULT_CONFIDENCE,
        odds: DEFAULTS.DEFAULT_ODDS
      };
      validLegs.push(safeAlternative);
    }

    const validatedLegs: ParlayLeg[] = validLegs.slice(0, 3).map((leg: any, index: number) => ({
      id: leg.id || `leg-${index + 1}`,
      betType: leg.betType || 'spread',
      selection: leg.selection || '',
      target: leg.target || '',
      reasoning: leg.reasoning || 'No reasoning provided',
      confidence: Math.min(Math.max(leg.confidence || DEFAULTS.DEFAULT_CONFIDENCE, DEFAULTS.CONFIDENCE_MIN), DEFAULTS.CONFIDENCE_MAX),
      odds: leg.odds || DEFAULTS.DEFAULT_ODDS,
    }));

    const individualOdds = validatedLegs.map(leg => leg.odds);
    const calculatedOdds = calculateParlayOdds(individualOdds);

    return {
      id: `parlay-${Date.now()}`,
      legs: validatedLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
      gameContext: parsed.gameContext || `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
      aiReasoning: parsed.aiReasoning || 'AI analysis provided',
      overallConfidence: Math.min(Math.max(parsed.overallConfidence || DEFAULTS.DEFAULT_CONFIDENCE, DEFAULTS.CONFIDENCE_MIN), DEFAULTS.CONFIDENCE_MAX),
      estimatedOdds: calculatedOdds,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return createFallbackParlay(game);
  }
};

// Main Export
export const generateParlay = async (game: NFLGame): Promise<GeneratedParlay> => {
  try {
    const { homeRoster, awayRoster } = await fetchGameRosters(game);

    if (homeRoster.length === 0 || awayRoster.length === 0) {
      return createFallbackParlay(game);
    }

    const prompt = createParlayPrompt(game, homeRoster, awayRoster);

    const completion = await openai.chat.completions.create({
      model: API_CONFIG.OPENAI_MODEL,
      messages: [
        { role: "system", content: createSystemPrompt() },
        { role: "user", content: prompt }
      ],
      temperature: API_CONFIG.OPENAI_TEMPERATURE,
      max_tokens: API_CONFIG.OPENAI_MAX_TOKENS,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return parseAIResponse(response, game, homeRoster, awayRoster);
  } catch (error) {
    return createFallbackParlay(game);
  }
};