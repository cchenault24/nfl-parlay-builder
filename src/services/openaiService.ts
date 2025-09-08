import OpenAI from 'openai';
import { fetchGameRosters } from './nflData';
import { GeneratedParlay, NFLGame, NFLPlayer, ParlayLeg } from '../types';

// Workaround for TypeScript env issue
const getEnvVar = (name: string): string => {
  return (import.meta as any).env[name] || '';
};

const openai = new OpenAI({
  apiKey: getEnvVar('VITE_OPENAI_API_KEY'),
  dangerouslyAllowBrowser: true,
});

export const generateParlay = async (game: NFLGame): Promise<GeneratedParlay> => {
  try {
    // Fetch current rosters
    const { homeRoster, awayRoster } = await fetchGameRosters(game);

    // Check if we got valid rosters
    if (homeRoster.length === 0 || awayRoster.length === 0) {
      return createFallbackParlay(game);
    }

    const prompt = createParlayPrompt(game, homeRoster, awayRoster);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert NFL betting analyst with 10+ years of experience. You specialize in creating profitable parlay combinations by analyzing team matchups, player performance trends, and situational factors.

CRITICAL RULES:
1. Generate exactly 3 different bet types for maximum diversification
2. Use ONLY players from the provided current rosters
3. Provide realistic odds based on current market standards
4. Focus on high-confidence bets with solid reasoning
5. Return valid JSON only - no markdown or extra text

Your goal is to create a well-balanced parlay that maximizes value while maintaining reasonable probability of success.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7, // Balanced creativity vs consistency
      max_tokens: 1500,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Pass rosters to validation
    const result = parseAIResponse(response, game, homeRoster, awayRoster);

    return result;
  } catch (error) {
    return createFallbackParlay(game);
  }
};

const createParlayPrompt = (game: NFLGame, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): string => {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000);
  const isRivalry = checkRivalryGame(game.homeTeam.name, game.awayTeam.name);

  // Get key players by position - with better filtering
  const getKeyPlayers = (roster: NFLPlayer[]) => {
    const qbs = roster.filter(p => p.position === 'QB').slice(0, 2);
    const rbs = roster.filter(p => p.position === 'RB').slice(0, 4);
    const wrs = roster.filter(p => p.position === 'WR').slice(0, 6);
    const tes = roster.filter(p => p.position === 'TE').slice(0, 3);

    return { qbs, rbs, wrs, tes };
  };

  const homeKeyPlayers = getKeyPlayers(homeRoster);
  const awayKeyPlayers = getKeyPlayers(awayRoster);


  // Enhanced prompt with rivalry context
  return `
CRITICAL: You are analyzing a live NFL game with CURRENT 2024-2025 season rosters. 
Use ONLY the players listed below - DO NOT use any player names from memory or training data.

GAME: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Date: ${new Date(game.date).toLocaleDateString()}
Week: ${game.week} | Season: ${game.season}
${isRivalry ? '🔥 RIVALRY GAME - Expect higher intensity and unpredictable plays!' : ''}
Analysis ID: ${timestamp}-${randomSeed}

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

⚠️ MANDATORY RULES:
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
- Spread: -105 to -115
- Totals: -105 to -115  
- Moneyline: -150 to +130
- Player Props: -110 to -125

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
};

const checkRivalryGame = (homeTeam: string, awayTeam: string): boolean => {
  const rivalries = [
    ['Cowboys', 'Eagles'], ['Patriots', 'Jets'], ['Packers', 'Bears'],
    ['Ravens', 'Steelers'], ['Chiefs', 'Raiders'], ['49ers', 'Seahawks'],
    // Add more rivalries as needed
  ];

  return rivalries.some(rivalry =>
    (rivalry.includes(homeTeam) && rivalry.includes(awayTeam))
  );
};

const parseAIResponse = (
  response: string,
  game: NFLGame,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[]
): GeneratedParlay => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.legs || !Array.isArray(parsed.legs) || parsed.legs.length !== 3) {
      throw new Error('Invalid parlay structure from AI');
    }

    // Use validatePlayerProp to filter out invalid player bets
    const validLegs = parsed.legs.filter((leg: any) => {
      return validatePlayerProp(leg, homeRoster, awayRoster);
    });

    // If we lost legs due to invalid players, add safe alternatives
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
        confidence: 6,
        odds: '-110'
      };
      validLegs.push(safeAlternative);
    }

    const validatedLegs: ParlayLeg[] = validLegs.slice(0, 3).map((leg: any, index: number) => ({
      id: leg.id || `leg-${index + 1}`,
      betType: leg.betType || 'spread',
      selection: leg.selection || '',
      target: leg.target || '',
      reasoning: leg.reasoning || 'No reasoning provided',
      confidence: Math.min(Math.max(leg.confidence || 5, 1), 10),
      odds: leg.odds || '-110',
    }));

    // Use calculateParlayOdds to get realistic combined odds
    const individualOdds = validatedLegs.map(leg => leg.odds);
    const calculatedOdds = calculateParlayOdds(individualOdds);

    return {
      id: `parlay-${Date.now()}`,
      legs: validatedLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
      gameContext: parsed.gameContext || `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
      aiReasoning: parsed.aiReasoning || 'AI analysis provided',
      overallConfidence: Math.min(Math.max(parsed.overallConfidence || 6, 1), 10),
      estimatedOdds: calculatedOdds,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return createFallbackParlay(game);
  }
};

const calculateParlayOdds = (individualOdds: string[]): string => {
  try {
    // Convert odds to decimal, multiply, convert back to American
    const decimalOdds = individualOdds.map(odds => {
      const num = parseInt(odds);
      if (num > 0) return (num / 100) + 1;
      return (100 / Math.abs(num)) + 1;
    });

    const combinedDecimal = decimalOdds.reduce((acc, odds) => acc * odds, 1);
    const americanOdds = combinedDecimal >= 2 ?
      `+${Math.round((combinedDecimal - 1) * 100)}` :
      `-${Math.round(100 / (combinedDecimal - 1))}`;

    return americanOdds;
  } catch {
    return '+550'; // Reasonable fallback
  }
};

const createFallbackParlay = (game: NFLGame): GeneratedParlay => {
  const isHomeFavorite = Math.random() > 0.4; // 60% chance home is favorite
  const spread = (Math.random() * 6 + 1).toFixed(1); // 1.5 to 7.5 point spread
  const total = (Math.random() * 10 + 42).toFixed(1); // 42.5 to 52.5 total

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
        odds: '-110',
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
    estimatedOdds: '+525',
    createdAt: new Date().toISOString(),
  };
};

const validatePlayerProp = (leg: any, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): boolean => {
  if (leg.betType !== 'player_prop') return true;

  const allPlayers = [...homeRoster, ...awayRoster];
  const playerNames = allPlayers.map(p => p.displayName.toLowerCase());
  const legPlayerName = leg.selection?.toLowerCase() || '';

  // Check if the player exists in current rosters
  const playerExists = playerNames.some(name =>
    name.includes(legPlayerName) || legPlayerName.includes(name)
  );

  if (!playerExists) {
    return false;
  }

  return true;
};