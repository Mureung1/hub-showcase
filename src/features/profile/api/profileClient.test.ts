import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LearningProfile } from '../model/profileTypes'
import { deleteProfile, getProfile, saveProfile } from './profileClient'

const profile: LearningProfile = {
  displayName: '예린',
  learningGoal: 'React 앱 완성하기',
  preferredTracks: ['React'],
  dailyStudyMinutes: 60,
  level: 'beginner',
}

afterEach(() => vi.unstubAllEnvs())

describe('profileClient', () => {
  it('loads the profile through the configured Express API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8787/')
    const fetchImpl = vi.fn(async () => response({ profile })) as unknown as typeof fetch

    await expect(getProfile(fetchImpl)).resolves.toEqual({ profile })
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:8787/api/profile')
  })

  it('saves and deletes the singleton profile', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ profile }))
      .mockResolvedValueOnce(response({ profile: null })) as unknown as typeof fetch

    await expect(saveProfile(profile, fetchImpl)).resolves.toEqual({ profile })
    await expect(deleteProfile(fetchImpl)).resolves.toEqual({ profile: null })
    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/profile', { method: 'DELETE' })
  })

  it('surfaces HTTP failures instead of returning local data', async () => {
    const fetchImpl = vi.fn(async () => response({}, false, 503)) as unknown as typeof fetch

    await expect(getProfile(fetchImpl)).rejects.toThrow('Profile request failed (503)')
  })
})

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body }
}
