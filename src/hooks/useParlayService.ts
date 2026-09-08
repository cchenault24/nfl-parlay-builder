import useGeneralStore from '../store/generalStore'
import { useParlayGenerator } from './useParlayGenerator'

export const useParlayService = () => {
  const usingMock = useGeneralStore(state => state.devMockOverride)
  return { ...useParlayGenerator(), usingMock }
}
