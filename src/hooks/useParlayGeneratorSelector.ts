import useGeneralStore from '../store/generalStore'
import useParlayStore from '../store/parlayStore'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 * Creates 3 modes:
 * 1. Agentic Real Data (agentic + devMockOverride = false)
 * 2. Single-Shot Real Data (single-shot + devMockOverride = false)
 * 3. Single-Shot Mock Data (single-shot + devMockOverride = true)
 */
export const useParlayGeneratorSelector = () => {
  const parlayMode = useParlayStore(state => state.parlayMode)
  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const parlayGenerator = useParlayGenerator()

  // Determine if using mock data
  // Mock data is used when: single-shot mode AND dev override is enabled
  // Agentic mode never uses mock data (always uses AgentParlayService)
  const usingMock = parlayMode === 'single-shot' && devMockOverride

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
