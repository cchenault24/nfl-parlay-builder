export type ParlayStrategy =
  | 'conservative' // Lower risk, safer picks
  | 'aggressive' // Higher risk, higher reward
  | 'player_focused' // Heavy on player props
  | 'team_focused' // Heavy on game lines
  | 'contrarian' // Against public perception
  | 'trend_based' // Following recent patterns
  | 'situational' // Weather, rest, motivation factors

export interface StrategyConfig {
  name: string
  description: string
  temperature: number
  betTypeWeights: Record<string, number>
  riskProfile: 'low' | 'medium' | 'high'
  confidenceRange: [number, number]
}

export interface VarietyFactors {
  strategy: ParlayStrategy
  focusArea: 'offense' | 'defense' | 'special_teams' | 'balanced'
  playerTier: 'star' | 'role_player' | 'breakout_candidate' | 'veteran'
  gameScript: 'high_scoring' | 'defensive' | 'blowout' | 'close_game'
  marketBias: 'public_favorite' | 'sharp_play' | 'contrarian' | 'neutral'
}

export const PARLAY_STRATEGIES: Record<ParlayStrategy, StrategyConfig> = {
  conservative: {
    name: 'Conservative Value',
    description: 'Safe, high-probability bets with modest payouts',
    temperature: 0.3,
    betTypeWeights: {
      spread: 0.4,
      total: 0.4,
      moneyline: 0.2,
      player_prop: 0.3,
    },
    riskProfile: 'low',
    confidenceRange: [7, 9],
  },
  aggressive: {
    name: 'High Risk, High Reward',
    description: 'Bold picks targeting maximum payout potential',
    temperature: 0.9,
    betTypeWeights: {
      spread: 0.2,
      total: 0.2,
      moneyline: 0.3,
      player_prop: 0.6,
    },
    riskProfile: 'high',
    confidenceRange: [5, 7],
  },
  player_focused: {
    name: 'Player Performance',
    description: 'Emphasizes individual player props and matchups',
    temperature: 0.6,
    betTypeWeights: {
      spread: 0.1,
      total: 0.2,
      moneyline: 0.1,
      player_prop: 0.8,
    },
    riskProfile: 'medium',
    confidenceRange: [6, 8],
  },
  team_focused: {
    name: 'Team vs Team',
    description: 'Focuses on team performance and game flow',
    temperature: 0.5,
    betTypeWeights: {
      spread: 0.5,
      total: 0.4,
      moneyline: 0.3,
      player_prop: 0.1,
    },
    riskProfile: 'medium',
    confidenceRange: [6, 8],
  },
  contrarian: {
    name: 'Contrarian Play',
    description: 'Goes against popular opinion and public betting',
    temperature: 0.8,
    betTypeWeights: {
      spread: 0.3,
      total: 0.3,
      moneyline: 0.4,
      player_prop: 0.4,
    },
    riskProfile: 'high',
    confidenceRange: [5, 7],
  },
  trend_based: {
    name: 'Follow the Trends',
    description: 'Based on recent team and player performance patterns',
    temperature: 0.4,
    betTypeWeights: {
      spread: 0.3,
      total: 0.3,
      moneyline: 0.2,
      player_prop: 0.5,
    },
    riskProfile: 'medium',
    confidenceRange: [6, 8],
  },
  situational: {
    name: 'Situational Analysis',
    description: 'Considers weather, rest, motivation, and situational factors',
    temperature: 0.7,
    betTypeWeights: {
      spread: 0.4,
      total: 0.5,
      moneyline: 0.2,
      player_prop: 0.3,
    },
    riskProfile: 'medium',
    confidenceRange: [6, 8],
  },
}

export const generateVarietyFactors = (): VarietyFactors => {
  const strategies: ParlayStrategy[] = [
    'conservative',
    'aggressive',
    'player_focused',
    'team_focused',
    'contrarian',
    'trend_based',
    'situational',
  ]

  const focusAreas: VarietyFactors['focusArea'][] = [
    'offense',
    'defense',
    'special_teams',
    'balanced',
  ]
  const playerTiers: VarietyFactors['playerTier'][] = [
    'star',
    'role_player',
    'breakout_candidate',
    'veteran',
  ]
  const gameScripts: VarietyFactors['gameScript'][] = [
    'high_scoring',
    'defensive',
    'blowout',
    'close_game',
  ]
  const marketBiases: VarietyFactors['marketBias'][] = [
    'public_favorite',
    'sharp_play',
    'contrarian',
    'neutral',
  ]

  return {
    strategy: strategies[Math.floor(Math.random() * strategies.length)],
    focusArea: focusAreas[Math.floor(Math.random() * focusAreas.length)],
    playerTier: playerTiers[Math.floor(Math.random() * playerTiers.length)],
    gameScript: gameScripts[Math.floor(Math.random() * gameScripts.length)],
    marketBias: marketBiases[Math.floor(Math.random() * marketBiases.length)],
  }
}
