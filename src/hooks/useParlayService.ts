import { useParlayGenerator } from '@shared/hooks/useParlayGenerator'
import { getParlayService } from '../services/container'
import useGeneralStore from '../store/generalStore'

export const useParlayService = () => {
  const usingMock = useGeneralStore(state => state.devMockOverride)
  const service = getParlayService(usingMock ? 'mock' : 'agent')
  return { ...useParlayGenerator(service), usingMock }
}
