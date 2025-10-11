import useGeneralStore from '../store/generalStore'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 */
export const useParlayGeneratorSelector = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const parlayGenerator = useParlayGenerator()

  // Compute final usingMock value
  // If devMockOverride is not null, use it (override)
  // Else default to: development = mock, production = real
  const usingMockDefault = import.meta.env.MODE === 'development'
  const usingMock =
    devMockOverride !== null ? devMockOverride : usingMockDefault

  return {
    ...parlayGenerator,
    serviceStatus: {
      usingMock,
      usingMockDefault,
      usingCloudFunction: !usingMock,
      environment: import.meta.env.MODE,
      ready: true,
    },
  }
}
