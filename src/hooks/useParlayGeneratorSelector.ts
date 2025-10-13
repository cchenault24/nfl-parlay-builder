import useParlayStore from '../store/parlayStore'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 */
export const useParlayGeneratorSelector = () => {
  const parlayMode = useParlayStore(state => state.parlayMode)
  const parlayGenerator = useParlayGenerator()

  // Use single-shot mode for mock, agentic mode for real
  const usingMock = parlayMode === 'single-shot'

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
