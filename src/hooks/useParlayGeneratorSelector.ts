import useGeneralStore from '../store/generalStore'
import { useMockParlayGenerator } from './useMockParlayGenerator'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 * Default: Uses mock data unless explicitly disabled
 */
export const useParlayGeneratorSelector = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)

  const realHook = useParlayGenerator()
  const mockHook = useMockParlayGenerator()

  if (devMockOverride) {
    return {
      ...mockHook,
      serviceStatus: {
        usingMock: true,
        usingCloudFunction: false,
        environment: import.meta.env.MODE || 'development',
        ready: true,
      },
    }
  }

  return {
    ...realHook,
    serviceStatus: {
      usingMock: false,
      usingCloudFunction: true,
      environment: import.meta.env.MODE || 'production',
      ready: true,
    },
  }
}
