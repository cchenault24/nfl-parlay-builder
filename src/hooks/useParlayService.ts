import useGeneralStore from '../store/generalStore'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 * Creates 2 modes:
 * 1. Agentic Real Data (devMockOverride = false)
 * 2. Agentic Mock Data (devMockOverride = true)
 */
export const useParlayService = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const parlayGenerator = useParlayGenerator()

  // Determine if using mock data
  // Mock data is used when dev override is enabled
  const usingMock = devMockOverride

  return {
    ...parlayGenerator,
    serviceStatus: {
      usingMock,
      usingMockDefault: false,
      usingCloudFunction: !usingMock,
      environment: import.meta.env.MODE,
      ready: true,
    },
  }
}
