import useGeneralStore from '../store/generalStore'
import { useMockParlayGenerator } from './useMockParlayGenerator'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 * based on environment configuration and dev overrides from Zustand store
 */
export const useParlayGeneratorSelector = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)

  let shouldUseMock: boolean

  if (devMockOverride !== null) {
    // Use the dev override if it exists
    shouldUseMock = devMockOverride
  } else {
    // Use default logic
    shouldUseMock =
      import.meta.env.MODE === 'development' ||
      import.meta.env.VITE_USE_MOCK_OPENAI === 'true' ||
      !import.meta.env.VITE_OPENAI_API_KEY
  }

  const realHook = useParlayGenerator()
  const mockHook = useMockParlayGenerator()

  if (shouldUseMock) {
    console.log('🎭 Using Mock Parlay Generator')
    return {
      ...mockHook,
      serviceStatus: {
        usingMock: true,
        hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY,
        environment: import.meta.env.MODE || 'development',
      },
    }
  }

  console.log('🤖 Using Real Parlay Generator')
  return {
    ...realHook,
    serviceStatus: {
      usingMock: false,
      hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY,
      environment: import.meta.env.MODE || 'production',
    },
  }
}
