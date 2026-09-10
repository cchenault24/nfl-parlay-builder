import AsyncStorage from '@react-native-async-storage/async-storage'
import { createRateLimitStore } from '@shared/store/rateLimitStore'
import { createJSONStorage } from 'zustand/middleware'

// The shared store persists to localStorage by default, which does not exist
// here.
const useRateLimitStore = createRateLimitStore(
  createJSONStorage(() => AsyncStorage)
)

export default useRateLimitStore
