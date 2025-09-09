import { GeneratedParlay, NFLGame, NFLPlayer, ParlayLeg } from '../types';
import { StrategyConfig, VarietyFactors, PARLAY_STRATEGIES } from './parlayStrategies';

export const calculateParlayOdds = (individualOdds: string[]): string => {
  try {
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
    return '+550';
  }
};

export const validatePlayerProp = (leg: any, homeRoster: NFLPlayer[], awayRoster: NFLPlayer[]): boolean => {
  if (leg.betType !== 'player_prop') return true;

  const allPlayers = [...homeRoster, ...awayRoster];
  const playerNames = allPlayers.map(p => p.displayName.toLowerCase());
  const legPlayerName = leg.selection?.toLowerCase() || '';

  const playerExists = playerNames.some(name =>
    name.includes(legPlayerName) || legPlayerName.includes(name)
  );

  return playerExists;
};

export const createStrategyAlternative = (
  legIndex: number, 
  game: NFLGame, 
  strategy: StrategyConfig,
  varietyFactors: VarietyFactors
): any => {
  const alternatives = [
    {
      id: `alt-${legIndex + 1}`,
      betType: 'spread',
      selection: Math.random() > 0.5 ? game.homeTeam.displayName : game.awayTeam.displayName,
      target: `${Math.random() > 0.5 ? game.homeTeam.displayName : game.awayTeam.displayName} ${Math.random() > 0.5 ? '-' : '+'}${(Math.random() * 6 + 1).toFixed(1)}`,
      reasoning: `${strategy.name} selection based on ${varietyFactors.focusArea} analysis`,
      confidence: strategy.confidenceRange[0],
      odds: '-110'
    },
    {
      id: `alt-${legIndex + 1}`,
      betType: 'total',
      selection: Math.random() > 0.5 ? 'Over' : 'Under',
      target: `${Math.random() > 0.5 ? 'Over' : 'Under'} ${(Math.random() * 10 + 42).toFixed(1)} Total Points`,
      reasoning: `${varietyFactors.gameScript} game script supports this total`,
      confidence: strategy.confidenceRange[1],
      odds: '-105'
    },
    {
      id: `alt-${legIndex + 1}`,
      betType: 'moneyline',
      selection: Math.random() > 0.6 ? game.homeTeam.displayName : game.awayTeam.displayName,
      target: `${Math.random() > 0.6 ? game.homeTeam.displayName : game.awayTeam.displayName} Moneyline`,
      reasoning: `${strategy.name} value play based on situational factors`,
      confidence: Math.floor((strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2),
      odds: Math.random() > 0.5 ? '+110' : '-120'
    }
  ];

  return alternatives[legIndex % alternatives.length];
};

export const createFallbackParlay = (game: NFLGame, varietyFactors?: VarietyFactors): GeneratedParlay => {
  const isHomeFavorite = Math.random() > 0.4;
  const spread = (Math.random() * 6 + 1).toFixed(1);
  const total = (Math.random() * 10 + 42).toFixed(1);

  // Add variety to fallback based on strategy
  const strategy = varietyFactors ? PARLAY_STRATEGIES[varietyFactors.strategy] : PARLAY_STRATEGIES.conservative;

  return {
    id: `fallback-${Date.now()}`,
    legs: [
      {
        id: 'fallback-1',
        betType: 'spread',
        selection: isHomeFavorite ? game.homeTeam.displayName : game.awayTeam.displayName,
        target: `${isHomeFavorite ? game.homeTeam.displayName : game.awayTeam.displayName} ${isHomeFavorite ? '-' : '+'}${spread}`,
        reasoning: `${strategy.name} approach: ${isHomeFavorite ? 'Home field advantage' : 'Road team value'} analysis.`,
        confidence: strategy.confidenceRange[0],
        odds: '-110',
      },
      {
        id: 'fallback-2',
        betType: 'total',
        selection: Math.random() > 0.5 ? 'Over' : 'Under',
        target: `${Math.random() > 0.5 ? 'Over' : 'Under'} ${total} Total Points`,
        reasoning: `${strategy.name} total based on expected game flow and pace factors.`,
        confidence: strategy.confidenceRange[1],
        odds: '-105',
      },
      {
        id: 'fallback-3',
        betType: 'player_prop',
        selection: 'Starting QB',
        target: 'Starting QB Over 250.5 Passing Yards',
        reasoning: `${strategy.name} quarterback prop based on matchup analysis.`,
        confidence: Math.floor((strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2),
        odds: '-115',
      },
    ],
    gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - ${strategy.name}`,
    aiReasoning: `${strategy.name} fallback parlay: ${strategy.description}`,
    overallConfidence: Math.floor((strategy.confidenceRange[0] + strategy.confidenceRange[1]) / 2),
    estimatedOdds: '+525',
    createdAt: new Date().toISOString(),
  };
};

export const parseAIResponse = (
  response: string,
  game: NFLGame,
  homeRoster: NFLPlayer[],
  awayRoster: NFLPlayer[],
  varietyFactors: VarietyFactors
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

    // If we lost legs due to invalid players, add strategy-appropriate alternatives
    while (validLegs.length < 3) {
      const strategy = PARLAY_STRATEGIES[varietyFactors.strategy];
      const safeAlternative = createStrategyAlternative(validLegs.length, game, strategy, varietyFactors);
      validLegs.push(safeAlternative);
    }

    const validatedLegs: ParlayLeg[] = validLegs.slice(0, 3).map((leg: any, index: number) => ({
      id: leg.id || `leg-${index + 1}`,
      betType: leg.betType || 'spread',
      selection: leg.selection || '',
      target: leg.target || '',
      reasoning: leg.reasoning || 'Strategy-based selection',
      confidence: Math.min(Math.max(leg.confidence || 5, 1), 10),
      odds: leg.odds || '-110',
    }));

    // Use calculateParlayOdds to get realistic combined odds
    const individualOdds = validatedLegs.map(leg => leg.odds);
    const calculatedOdds = calculateParlayOdds(individualOdds);

    // Add strategy info to context
    const strategyName = PARLAY_STRATEGIES[varietyFactors.strategy].name;

    return {
      id: `parlay-${Date.now()}`,
      legs: validatedLegs as [ParlayLeg, ParlayLeg, ParlayLeg],
      gameContext: `${game.awayTeam.displayName} @ ${game.homeTeam.displayName} - ${strategyName}`,
      aiReasoning: parsed.aiReasoning || `${strategyName} approach: ${PARLAY_STRATEGIES[varietyFactors.strategy].description}`,
      overallConfidence: Math.min(Math.max(parsed.overallConfidence || 6, 1), 10),
      estimatedOdds: calculatedOdds,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return createFallbackParlay(game, varietyFactors);
  }
};