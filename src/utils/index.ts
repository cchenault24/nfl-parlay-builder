export { getBetTypeColor, getConfidenceColor } from '@shared/betColors'
export { formatOdds, impliedProbability } from '@shared/odds'
export * from '@shared/teamLogos'

export const getEnvVar = (name: string): string => import.meta.env[name] || ''

