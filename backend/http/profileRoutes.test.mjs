import { describe, expect, it } from 'vitest'
import { createInMemoryProfileRepository } from '../modules/profile/adapters/inMemoryProfileRepository.mjs'
import { handleProfileApiRequest } from './profileRoutes.mjs'

const validProfile = {
  displayName: '예린',
  learningGoal: 'React 앱 완성하기',
  preferredTracks: ['frontend'],
  dailyStudyMinutes: 60,
  level: 'beginner',
}

describe('profile routes', () => {
  it('returns null when the singleton profile does not exist', async () => {
    const result = await request('GET')

    expect(result).toMatchObject({ status: 200, body: { profile: null } })
  })

  it('saves and returns a valid profile', async () => {
    const repository = createInMemoryProfileRepository()
    const saved = await request('PUT', { repository, body: validProfile })
    const loaded = await request('GET', { repository })

    expect(saved).toMatchObject({ status: 200, body: { profile: validProfile } })
    expect(loaded).toMatchObject({ status: 200, body: { profile: validProfile } })
  })

  it('returns 400 without changing the profile for invalid input', async () => {
    const repository = createInMemoryProfileRepository(validProfile)
    const result = await request('PUT', {
      repository,
      body: { ...validProfile, preferredTracks: [] },
    })

    expect(result).toMatchObject({ status: 400, body: { error: 'invalid_profile' } })
    await expect(repository.get()).resolves.toEqual(validProfile)
  })

  it('removes the singleton profile', async () => {
    const repository = createInMemoryProfileRepository(validProfile)
    const result = await request('DELETE', { repository })

    expect(result).toMatchObject({ status: 200, body: { profile: null } })
    await expect(repository.get()).resolves.toBeNull()
  })

  it('rejects unsupported methods with an Allow header', async () => {
    const result = await request('POST')

    expect(result).toMatchObject({ status: 405, headers: { Allow: 'GET, PUT, DELETE, OPTIONS' } })
  })
})

function request(method, { repository = createInMemoryProfileRepository(), body } = {}) {
  return handleProfileApiRequest({
    method,
    url: 'http://localhost/api/profile',
    bodyText: body === undefined ? '' : JSON.stringify(body),
    profileRepository: repository,
  })
}
