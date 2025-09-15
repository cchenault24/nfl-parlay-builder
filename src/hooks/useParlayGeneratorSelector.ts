import useGeneralStore from '../store/generalStore'
import { useMockParlayGenerator } from './useMockParlayGenerator'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 * Default: Uses mock data unless explicitly disabled
 */
export const useParlayGeneratorSelector = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)

  let shouldUseMock: boolean

  if (devMockOverride !== null) {
    // Use the dev override if it exists
    shouldUseMock = devMockOverride
  } else {
    // Updated logic: Default to mock unless explicitly disabled
    shouldUseMock = import.meta.env.VITE_USE_MOCK_OPENAI !== 'false'
  }

  const realHook = useParlayGenerator()
  const mockHook = useMockParlayGenerator()

  if (shouldUseMock) {
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
