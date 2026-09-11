import { sharedRuntime } from '../runtime'

export interface AccountDeletion {
  // Set when the account was deleted while a subscription was still live.
  // Neither store cancels one because an account disappeared, so the user has
  // to stop it where they bought it — and the deletion does not wait for that.
  subscriptionStillActive?: 'stripe' | 'iap' | 'manual'
}

export class AccountService {
  // Deletes the signed-in user and everything they own. Callers sign out
  // afterwards rather than before: the request needs a live token, and the
  // Auth user is gone by the time it returns, so the token in hand is already
  // dead either way.
  async deleteAccount(token: string): Promise<AccountDeletion> {
    const res = await fetch(`${sharedRuntime().baseURL}/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(body?.message ?? `Request failed (${res.status})`)
    }
    return ((await res.json().catch(() => null)) ?? {}) as AccountDeletion
  }
}
