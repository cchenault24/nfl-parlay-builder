import { useQuery } from '@tanstack/react-query'
import { EntitlementsService } from '../api/EntitlementsService'
import { sharedRuntime } from '../runtime'
import type { Entitlements } from '../tiering'

const service = new EntitlementsService()

export const ENTITLEMENTS_QUERY_KEY = 'entitlements'

// Everything the UI needs to decide what to lock, and what the quota says.
// Nothing here defines a limit — the server sends them, so a tier change needs
// no client deploy and a tampered client gains nothing.
export const useEntitlements = () => {
  const runtime = sharedRuntime()
  const { uid, loading } = runtime.useAuthUser()

  const query = useQuery({
    queryKey: [ENTITLEMENTS_QUERY_KEY, uid],
    queryFn: async (): Promise<Entitlements> => {
      const token = await runtime.getIdToken()
      if (!token) {
        throw new Error('Not signed in')
      }
      return service.getEntitlements(token)
    },
    enabled: !!uid,
    // A subscription bought in a Stripe tab, or a generation spent in another
    // one, should show up here without a reload.
    staleTime: 30_000,
    retry: false,
  })

  const entitlements = query.data
  return {
    entitlements,
    // Treated as Free until proven otherwise. Failing open would hand out Pro
    // features whenever the entitlements call errored.
    isPro: entitlements?.tier === 'pro',
    capabilities: entitlements?.capabilities,
    quota: entitlements?.quota,
    isLoading: query.isLoading || loading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
