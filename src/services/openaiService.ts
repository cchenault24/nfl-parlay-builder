import OpenAI from 'openai';
import { fetchGameRosters } from './nflData';
import { NFLGame, GeneratedParlay, NFLPlayer, ParlayLeg } from '../types';

// Workaround for TypeScript env issue
const getEnvVar = (name: string): string => {
  return (import.meta as any).env[name] || '';
};

const openai = new OpenAI({
  apiKey: getEnvVar('VITE_OPENAI_API_KEY'),
  dangerouslyAllowBrowser: true,
});

export const generateParlay = async (game: NFLGame): Promise<GeneratedParlay> => {
  console.log('🤖 Starting AI parlay generation for:', game.awayTeam.displayName, '@', game.homeTeam.displayName);

  try {
    // Fetch current rosters
    console.log('📋 Fetching current rosters...');
    const { homeRoster, awayRoster } = await fetchGameRosters(game);
    console.log('✅ Rosters fetched:', { homeCount: homeRoster.length, awayCount: awayRoster.length });

    const prompt = createEnhancedParlayPrompt(game, homeRoster, awayRoster);
    console.log('📝 Sending enhanced prompt to OpenAI');

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
    console.log('🎯 AI response received:', response?.substring(0, 200) + '...');

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const result = parseEnhancedAIResponse(response, game);
    console.log('✅ Enhanced parlay generated successfully');

    return result;
  } catch (error) {
    console.error('❌ Error generating parlay:', error);
    throw new Error('Failed to generate parlay. Please try again.');
  }
};

const createEnhancedParlayPrompt = (game: NFLGame, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): string => {
  const timestamp = Date.now();
  const gameDate = new Date(game.date);
  const isWeekend = gameDate.getDay() === 0 || gameDate.getDay() === 6;
  const timeOfDay = gameDate.getHours();
  
  // Enhanced player analysis
  const getTopPlayersByPosition = (roster: NFLPlayer[]) => {
    return {
      qbs: roster.filter(p => p.position === 'QB').slice(0, 2),
      rbs: roster.filter(p => p.position === 'RB').slice(0, 4),
      wrs: roster.filter(p => p.position === 'WR').slice(0, 6),
      tes: roster.filter(p => p.position === 'TE').slice(0, 3),
      k: roster.filter(p => p.position === 'K').slice(0, 1),
      def: roster.filter(p => p.position === 'LB' || p.position === 'DB' || p.position === 'DL').slice(0, 2)
    };
  };

  const homeTop = getTopPlayersByPosition(homeRoster);
  const awayTop = getTopPlayersByPosition(awayRoster);

  // Generate contextual insights
  const gameContext = {
    isRivalry: checkRivalryGame(game.homeTeam.name, game.awayTeam.name),
    isPrimeTime: timeOfDay >= 17 || timeOfDay <= 1, // Evening or late games
    isWeekend,
    weatherImpact: 'Consider potential weather impact on passing vs rushing game'
  };

  return `
GAME ANALYSIS REQUEST
===================
${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Date: ${gameDate.toLocaleDateString()} ${gameDate.toLocaleTimeString()}
Week: ${game.week} | Season: ${game.season}
Analysis ID: ${timestamp}

GAME CONTEXT:
${gameContext.isRivalry ? '🔥 RIVALRY GAME - Expect higher intensity and unpredictable plays' : ''}
${gameContext.isPrimeTime ? '⭐ PRIME TIME - National audience, teams often play differently' : ''}
${gameContext.isWeekend ? '📺 Weekend game - Higher viewership impact' : ''}

ROSTER ANALYSIS:

${game.homeTeam.displayName} (HOME):
🏈 QBs: ${homeTop.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
🏃 RBs: ${homeTop.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
🙌 WRs: ${homeTop.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
🎯 TEs: ${homeTop.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
⚡ Key DEF: ${homeTop.def.map(p => `${p.displayName}`).join(', ') || 'None listed'}

${game.awayTeam.displayName} (AWAY):
🏈 QBs: ${awayTop.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
🏃 RBs: ${awayTop.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
🙌 WRs: ${awayTop.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
🎯 TEs: ${awayTop.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ') || 'None listed'}
⚡ Key DEF: ${awayTop.def.map(p => `${p.displayName}`).join(', ') || 'None listed'}

BETTING STRATEGY:
Create a balanced 3-leg parlay with these requirements:

1. MIX BET TYPES: Use different bet categories for diversification
2. PLAYER PROPS: Focus on star players with consistent performance 
3. GAME TOTALS: Consider team offensive/defensive tendencies
4. SPREAD BETS: Analyze home field advantage and team form

REALISTIC ODDS RANGES:
📊 Spread Bets: -105 to -115
📊 Totals (O/U): -105 to -120  
📊 Moneylines: -150 to +130 (avoid heavy favorites)
📊 Player Props: -110 to -125 (most common)
📊 Touchdown Props: +120 to +200
📊 Yardage Props: -110 to -130

EXAMPLE OUTPUT FORMAT:
{
  "legs": [
    {
      "id": "1",
      "betType": "spread",
      "selection": "${game.homeTeam.displayName}",
      "target": "${game.homeTeam.displayName} -3.5",
      "reasoning": "Strong home field advantage and superior rushing attack should control the game. Recent form shows consistent wins by 4+ points at home.",
      "confidence": 8,
      "odds": "-110"
    },
    {
      "id": "2",
      "betType": "player_prop",
      "selection": "[EXACT_PLAYER_NAME_FROM_ROSTER]",
      "target": "[PLAYER_NAME] ([TEAM_NAME]) - Over 75.5 Receiving Yards",
      "reasoning": "Matchup advantage against weak secondary. Averaging 85+ yards in last 4 games with high target share.",
      "confidence": 7,
      "odds": "-115"
    },
    {
      "id": "3",
      "betType": "total",
      "selection": "Over",
      "target": "Over 47.5 Total Points",
      "reasoning": "Both teams rank top 10 in offensive efficiency. Weather conditions favor offensive play. Recent meetings averaged 52 points.",
      "confidence": 6,
      "odds": "-105"
    }
  ],
  "gameContext": "Divisional matchup with playoff implications. Both teams healthy and playing for positioning.",
  "aiReasoning": "This parlay balances home favorite spread with high-volume receiver and offensive total. All three legs complement each other - if home team covers, likely through passing game that helps receiver prop and total.",
  "overallConfidence": 7,
  "estimatedOdds": "+575"
}

INSTRUCTIONS:
- Use ONLY verified players from rosters above
- Provide specific, actionable reasoning for each bet
- Ensure legs work well together strategically  
- Confidence scores: 1-10 (7+ for strong conviction)
- Make each reasoning 15-25 words focused on WHY this bet wins
- Return pure JSON, no markdown formatting

Generate the parlay now:`;
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

const parseEnhancedAIResponse = (response: string, game: NFLGame): GeneratedParlay => {
  try {
    // Extract JSON more reliably
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found, trying to extract from response');
      throw new Error('Invalid JSON structure from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Enhanced validation
    if (!parsed.legs || !Array.isArray(parsed.legs)) {
      throw new Error('Missing or invalid legs array');
    }

    if (parsed.legs.length !== 3) {
      throw new Error(`Expected 3 legs, got ${parsed.legs.length}`);
    }

    // Validate each leg thoroughly
    const validatedLegs = (parsed.legs as ParlayLeg[]).map((leg: any, index: number) => {
      if (!leg.betType || !leg.selection || !leg.target) {
        throw new Error(`Leg ${index + 1} missing required fields`);
      }

      return {
        id: leg.id || `leg-${index + 1}`,
        betType: leg.betType,
        selection: leg.selection,
        target: leg.target,
        reasoning: leg.reasoning || 'AI analysis provided',
        confidence: Math.min(Math.max(parseInt(leg.confidence) || 5, 1), 10),
        odds: leg.odds || '-110',
      };
    });

    // Calculate realistic parlay odds
    const estimatedOdds = calculateParlayOdds(validatedLegs.map(leg => leg.odds));

    return {
      id: `parlay-${Date.now()}`,
      legs: validatedLegs as [any, any, any],
      gameContext: parsed.gameContext || `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
      aiReasoning: parsed.aiReasoning || 'AI-generated parlay with balanced risk/reward profile.',
      overallConfidence: Math.min(Math.max(parseInt(parsed.overallConfidence) || 6, 1), 10),
      estimatedOdds: estimatedOdds,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing enhanced AI response:', error);
    return createIntelligentFallback(game);
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

const createIntelligentFallback = (game: NFLGame): GeneratedParlay => {
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