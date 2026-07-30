import { apiUrl } from '../../../app/apiUrl'
import type { LearningProfile } from '../model/profileTypes'

export type ProfileResponse = {
  profile: LearningProfile | null
}

export const profileEndpoint = '/api/profile'

export async function getProfile(fetchImpl: typeof fetch = fetch): Promise<ProfileResponse> {
  return requestProfile(fetchImpl, apiUrl(profileEndpoint))
}

export async function saveProfile(
  profile: LearningProfile,
  fetchImpl: typeof fetch = fetch,
): Promise<{ profile: LearningProfile }> {
  return requestProfile(fetchImpl, apiUrl(profileEndpoint), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  }) as Promise<{ profile: LearningProfile }>
}

export async function deleteProfile(fetchImpl: typeof fetch = fetch): Promise<ProfileResponse> {
  return requestProfile(fetchImpl, apiUrl(profileEndpoint), { method: 'DELETE' })
}

async function requestProfile(fetchImpl: typeof fetch, url: string, init?: RequestInit) {
  const response = init ? await fetchImpl(url, init) : await fetchImpl(url)
  if (!response.ok) throw new Error(`Profile request failed (${response.status})`)

  return (await response.json()) as ProfileResponse
}
