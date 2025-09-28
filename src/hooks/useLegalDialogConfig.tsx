// src/hooks/useLegalDialogConfig.ts
import { useEffect, useState } from 'react'
import { BaseLegalDialogProps } from '../features/legal/BaseLegalDialog'
// import { legalDialogConfigs } from '../features/legal/legalDialogConfigs' // TODO: Use legal dialog configs

type ConfigKey =
  | 'termsOfServiceConfig'
  | 'privacyPolicyConfig'
  | 'legalDisclaimerConfig'

export const useLegalDialogConfig = (isOpen: boolean, configKey: ConfigKey) => {
  const [config, setConfig] = useState<Omit<
    BaseLegalDialogProps,
    'open' | 'onClose'
  > | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && !config && !loading) {
      setLoading(true)
      setError(null)

      import('../features/legal/legalDialogConfigs')
        .then(configs => {
          setConfig(configs[configKey])
          setLoading(false)
        })
        .catch(err => {
          console.error(`Failed to load ${configKey}:`, err)
          setError('Failed to load legal content')
          setLoading(false)
        })
    }
  }, [isOpen, config, loading, configKey])

  return { config, loading, error }
}
