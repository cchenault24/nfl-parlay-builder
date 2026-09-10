import { sharedRuntime } from '../runtime'
import type { Entitlements } from '../tiering'

export class EntitlementsService {
  private async request<T>(
    path: string,
    token: string,
    init: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${sharedRuntime().baseURL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(body?.message ?? `Request failed (${res.status})`)
    }
    return res.json() as Promise<T>
  }

  // The server is the only place tier limits are defined; this is how a client
  // learns them. Nothing here hardcodes a number.
  getEntitlements(token: string): Promise<Entitlements> {
    return this.request('/entitlements', token)
  }

  // Both return a URL to send the browser to. Checkout starts a subscription;
  // the portal manages an existing one.
  async startCheckout(token: string): Promise<string> {
    const { url } = await this.request<{ url: string }>('/billing/checkout', token, {
      method: 'POST',
    })
    return url
  }

  async openBillingPortal(token: string): Promise<string> {
    const { url } = await this.request<{ url: string }>('/billing/portal', token, {
      method: 'POST',
    })
    return url
  }

  // Native only. The signed transaction comes from StoreKit; the server decides
  // whether it grants anything.
  redeemAppleTransaction(
    token: string,
    signedTransaction: string
  ): Promise<{ tier: 'pro' | 'free'; accessEndsAt: string | null }> {
    return this.request('/billing/apple/redeem', token, {
      method: 'POST',
      body: JSON.stringify({ signedTransaction }),
    })
  }
}
