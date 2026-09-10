import { API_CONFIG } from '../config/api'

// The link shown to the user. Built from the current origin so it works the
// same in local development and production without another config value.
export function shareUrl(shareId: string): string {
  return `${window.location.origin}/p/${shareId}`
}

export async function shareParlay(parlayId: string, token: string): Promise<string> {
  const res = await fetch(
    `${API_CONFIG.CLOUD_FUNCTIONS.baseURL}/parlays/${parlayId}/share`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw new Error('Could not create a share link')
  }
  const { shareId } = (await res.json()) as { shareId: string }
  return shareId
}

export async function unshareParlay(parlayId: string, token: string): Promise<void> {
  const res = await fetch(
    `${API_CONFIG.CLOUD_FUNCTIONS.baseURL}/parlays/${parlayId}/share`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw new Error('Could not stop sharing')
  }
}
