import { API } from './config'

// Fire-and-forget trigger: grades any of the caller's saved parlays that
// aren't graded yet. Results land via the existing real-time Firestore
// listener on the parlays collection, not this response.
export async function requestGrading(token: string): Promise<void> {
  await fetch(`${API.baseURL}/parlays/grade`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}
