import useGeneralStore from '../store/generalStore'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 */
export const useParlayGeneratorSelector = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const parlayGenerator = useParlayGenerator()

  // Determine if we're using mock based on the actual provider being used
  const isUsingMock = () => {
    if (devMockOverride !== null) {
      return devMockOverride
    }
    // Default to mock in development, real in production
    return import.meta.env.MODE === 'development'
  }

  const usingMock = isUsingMock()

  return {
    ...parlayGenerator,
    serviceStatus: {
      usingMock,
      usingCloudFunction: !usingMock,
      environment: import.meta.env.MODE,
      ready: true,
    },
  }
}
