import OpenAI from 'openai';
import type { NFLGame } from '../types/nfl';
import type { GeneratedParlay } from '../types/parlay';

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
    const prompt = createParlayPrompt(game);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert NFL betting analyst. Generate exactly 3 different bet recommendations for a single NFL game. Mix spread bets and player props based on your confidence. Return response as valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return parseAIResponse(response, game);
  } catch (error) {
    console.error('Error generating parlay:', error);
    throw new Error('Failed to generate parlay. Please try again.');
  }
};

const createParlayPrompt = (game: NFLGame): string => {
  return `
Analyze this NFL game: ${game.awayTeam.displayName} @ ${game.homeTeam.displayName}
Date: ${new Date(game.date).toLocaleDateString()}
Week: ${game.week}

Generate exactly 3 different bet recommendations. Mix spread bets and player props based on your analysis and confidence level.

Return your response as a JSON object with this exact structure:
{
  "legs": [
    {
      "id": "1",
      "betType": "spread",
      "selection": "Chiefs",
      "target": "Chiefs -3.5",
      "reasoning": "Detailed reasoning for this bet",
      "confidence": 8
    },
    {
      "id": "2", 
      "betType": "player_prop",
      "selection": "Patrick Mahomes",
      "target": "Mahomes Over 250.5 Passing Yards",
      "reasoning": "Detailed reasoning for this prop",
      "confidence": 7
    },
    {
      "id": "3",
      "betType": "total",
      "selection": "Over",
      "target": "Over 45.5 Total Points",
      "reasoning": "Detailed reasoning for this total",
      "confidence": 6
    }
  ],
  "gameContext": "Brief summary of the game matchup",
  "aiReasoning": "Overall analysis of why these 3 bets work together",
  "overallConfidence": 7,
  "estimatedOdds": "+650"
}

Confidence scale: 1-10 (10 being most confident)
Bet types: "spread", "total", "moneyline", "player_prop"
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