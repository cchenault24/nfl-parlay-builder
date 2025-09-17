import useGeneralStore from '../store/generalStore'
import { useParlayGenerator } from './useParlayGenerator'

/**
 * Hook that automatically selects between real and mock parlay generators
 */
export const useParlayGeneratorSelector = () => {
  const devMockOverride = useGeneralStore(state => state.devMockOverride)
  const parlayGenerator = useParlayGenerator()

  return {
    ...parlayGenerator,
    serviceStatus: {
      usingMock: devMockOverride,
      usingCloudFunction: !devMockOverride,
      environment: import.meta.env.MODE,
      ready: true,
    },
  }
}
