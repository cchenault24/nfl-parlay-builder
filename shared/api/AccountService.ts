import { sharedRuntime } from '../runtime'

export class AccountService {
  // Deletes the signed-in user and everything they own. Callers sign out
  // afterwards rather than before: the request needs a live token, and the
  // Auth user is gone by the time it returns, so the token in hand is already
  // dead either way.
  //
  // Refuses with `subscription_active` while Pro is live — neither store
  // cancels a subscription because an account disappeared.
  async deleteAccount(token: string): Promise<void> {
    const res = await fetch(`${sharedRuntime().baseURL}/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(body?.message ?? `Request failed (${res.status})`)
    }
  }
}
