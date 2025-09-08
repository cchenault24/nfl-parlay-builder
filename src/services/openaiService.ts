import OpenAI from 'openai';
import type { NFLGame, NFLPlayer } from '../types/nfl';
import type { GeneratedParlay } from '../types/parlay';
import { fetchGameRosters } from './nflData';

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

    const prompt = createParlayPrompt(game, homeRoster, awayRoster);
    console.log('📝 Sending prompt to OpenAI with roster data');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert NFL betting analyst. Generate exactly 3 different bet recommendations for a single NFL game using ONLY the current roster information provided. Mix spread bets and player props based on your confidence. Return response as valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 1200, // Increased for roster data
    });

    const response = completion.choices[0]?.message?.content;
    console.log('🎯 Raw AI response:', response);
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const result = parseAIResponse(response, game);
    console.log('✅ Parsed parlay result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error generating parlay:', error);
    console.log('🔄 Falling back to mock data');
    throw new Error('Failed to generate parlay. Please try again.');
  }
};

const createParlayPrompt = (game: NFLGame, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): string => {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000);
  
  // Get key players by position
  const getKeyPlayers = (roster: NFLPlayer[]) => {
    const qbs = roster.filter(p => p.position === 'QB').slice(0, 2);
    const rbs = roster.filter(p => p.position === 'RB').slice(0, 3);
    const wrs = roster.filter(p => p.position === 'WR').slice(0, 4);
    const tes = roster.filter(p => p.position === 'TE').slice(0, 2);
    
    return { qbs, rbs, wrs, tes };
  };

  const homeKeyPlayers = getKeyPlayers(homeRoster);
  const awayKeyPlayers = getKeyPlayers(awayRoster);
  
  return `
Analyze this NFL game: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Date: ${new Date(game.date).toLocaleDateString()}
Week: ${game.week}
Analysis ID: ${timestamp}-${randomSeed}

CURRENT ROSTERS - USE ONLY THESE PLAYERS FOR PROPS:

${game.homeTeam.displayName} Key Players:
QBs: ${homeKeyPlayers.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}
RBs: ${homeKeyPlayers.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}  
WRs: ${homeKeyPlayers.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}
TEs: ${homeKeyPlayers.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}

${game.awayTeam.displayName} Key Players:
QBs: ${awayKeyPlayers.qbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}
RBs: ${awayKeyPlayers.rbs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}
WRs: ${awayKeyPlayers.wrs.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}
TEs: ${awayKeyPlayers.tes.map(p => `${p.displayName} (#${p.jerseyNumber})`).join(', ')}

Generate exactly 3 DIFFERENT bet recommendations using a mix of:

TEAM BETS:
- Spread bets (team to cover)
- Over/Under total points
- Moneyline, team totals

PLAYER PROPS (USE ONLY PLAYERS LISTED ABOVE):
- QB passing yards (typical range: 200-350)
- RB rushing yards (typical range: 50-150) 
- WR/TE receiving yards (typical range: 40-120)
- Player touchdowns (anytime scorer)

IMPORTANT: Only use players from the rosters provided above. Do not make up player names or use players not listed.

Return response as valid JSON:
{
  "legs": [
    {
      "id": "1",
      "betType": "spread",
      "selection": "${game.homeTeam.displayName}",
      "target": "${game.homeTeam.displayName} -3.5",
      "reasoning": "Detailed reasoning",
      "confidence": 8
    },
    {
      "id": "2", 
      "betType": "player_prop",
      "selection": "[EXACT PLAYER NAME FROM ROSTER]",
      "target": "[PLAYER NAME] Over 275.5 Passing Yards",
      "reasoning": "Player-specific analysis",
      "confidence": 7
    },
    {
      "id": "3",
      "betType": "total",
      "selection": "Over",
      "target": "Over 45.5 Total Points",
      "reasoning": "Game flow analysis",
      "confidence": 6
    }
  ],
  "gameContext": "Brief game summary",
  "aiReasoning": "Overall parlay strategy",
  "overallConfidence": 7,
  "estimatedOdds": "+650"
}

Use only verified current players. Vary bet combinations. Confidence: 1-10.
`;
};

const parseAIResponse = (response: string, game: NFLGame): GeneratedParlay => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.legs || !Array.isArray(parsed.legs) || parsed.legs.length !== 3) {
      throw new Error('Invalid parlay structure from AI');
    }

    const validatedLegs = parsed.legs.map((leg: any, index: number) => ({
      id: leg.id || `leg-${index + 1}`,
      betType: leg.betType || 'spread',
      selection: leg.selection || '',
      target: leg.target || '',
      reasoning: leg.reasoning || 'No reasoning provided',
      confidence: Math.min(Math.max(leg.confidence || 5, 1), 10),
    }));

    return {
      id: `parlay-${Date.now()}`,
      legs: validatedLegs as [any, any, any],
      gameContext: parsed.gameContext || `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
      aiReasoning: parsed.aiReasoning || 'AI analysis provided',
      overallConfidence: Math.min(Math.max(parsed.overallConfidence || 6, 1), 10),
      estimatedOdds: parsed.estimatedOdds || '+500',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return createFallbackParlay(game);
  }
};

const createFallbackParlay = (game: NFLGame): GeneratedParlay => {
  return {
    id: `fallback-${Date.now()}`,
    legs: [
      {
        id: 'fallback-1',
        betType: 'spread',
        selection: game.homeTeam.displayName,
        target: `${game.homeTeam.displayName} -3.5`,
        reasoning: 'Home field advantage analysis',
        confidence: 6,
      },
      {
        id: 'fallback-2',
        betType: 'total',
        selection: 'Over',
        target: 'Over 45.5 Total Points',
        reasoning: 'Both teams have strong offensive capabilities',
        confidence: 6,
      },
      {
        id: 'fallback-3',
        betType: 'player_prop',
        selection: 'QB',
        target: 'QB Over 250.5 Passing Yards',
        reasoning: 'Expected high-passing game script',
        confidence: 5,
      },
    ],
    gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName}`,
    aiReasoning: 'Fallback parlay generated due to AI processing error.',
    overallConfidence: 5,
    estimatedOdds: '+500',
    createdAt: new Date().toISOString(),
  };
};