import { createContext } from 'react'
import { ProviderContextValue } from './ProviderContextValue'

export const ProviderContext = createContext<ProviderContextValue | null>(null)
