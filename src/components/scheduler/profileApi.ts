import { request } from './apiClient'
import type { Profile } from './types'

export function fetchProfile() {
  return request<Profile>('/api/users/me')
}

export function updateProfile(patch: Partial<Pick<Profile, 'name' | 'handle' | 'bio' | 'avatarColor' | 'avatarEyes'>>) {
  return request<Profile>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
