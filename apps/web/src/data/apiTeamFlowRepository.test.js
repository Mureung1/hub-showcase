import { describe, expect, test, vi } from 'vitest'

import {
  createApiTeamFlowRepository,
  createDemoTeamFlowRepository,
  TeamFlowApiError,
} from './apiTeamFlowRepository.js'

const bootstrap = {
  projects: [], members: [], tasks: [], notes: [], resources: [], aiSettings: {}, aiHistory: [],
  currentUserId: 'member-1', aiMemberId: '', accessMode: 'authenticated',
  capabilities: { projects: true, members: true, tasks: true, notes: false, resources: false, ai: false },
}

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body }
}

describe('authenticated TeamFlow repository', () => {
  test('loads bootstrap with the current bearer token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(bootstrap))
    const repository = createApiTeamFlowRepository({ fetchImpl, getAccessToken: async () => 'access-token' })

    await expect(repository.load()).resolves.toEqual(bootstrap)
    expect(fetchImpl).toHaveBeenCalledWith('/api/bootstrap', {
      headers: { authorization: 'Bearer access-token' },
    })
  })

  test('creates a task and sends JSON through Express', async () => {
    const task = { id: 'task-1', projectId: 'project-1', title: '영속 할 일' }
    const fetchImpl = vi.fn(async () => jsonResponse({ task }))
    const repository = createApiTeamFlowRepository({ fetchImpl, getAccessToken: async () => 'access-token' })

    await expect(repository.createTask('project-1', { title: '영속 할 일' })).resolves.toEqual(task)
    expect(fetchImpl).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'POST',
      headers: { authorization: 'Bearer access-token', 'content-type': 'application/json' },
    }))
  })

  test('does not call the API when the session has no token', async () => {
    const fetchImpl = vi.fn()
    const repository = createApiTeamFlowRepository({ fetchImpl, getAccessToken: async () => null })

    await expect(repository.load()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('preserves safe API error details and hides network details', async () => {
    const apiRepository = createApiTeamFlowRepository({
      fetchImpl: vi.fn(async () => jsonResponse({ error: { code: 'VALIDATION_ERROR', message: '입력값을 확인해 주세요.' } }, false)),
      getAccessToken: async () => 'access-token',
    })
    await expect(apiRepository.load()).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: '입력값을 확인해 주세요.' })

    const networkRepository = createApiTeamFlowRepository({
      fetchImpl: vi.fn(async () => { throw new TypeError('private network detail') }),
      getAccessToken: async () => 'access-token',
    })
    await expect(networkRepository.load()).rejects.toEqual(expect.any(TeamFlowApiError))
    await expect(networkRepository.load()).rejects.toThrow('TeamFlow 데이터를 불러오지 못했습니다.')
  })
})

describe('guest TeamFlow repository', () => {
  test('loads the public demo and rejects every mutation', async () => {
    const demo = { ...bootstrap, accessMode: 'guest' }
    const fetchImpl = vi.fn(async () => jsonResponse(demo))
    const repository = createDemoTeamFlowRepository({ fetchImpl })

    await expect(repository.load()).resolves.toEqual(demo)
    expect(fetchImpl).toHaveBeenCalledWith('/api/demo', undefined)
    await expect(repository.createProject({ name: '금지' })).rejects.toMatchObject({ code: 'READ_ONLY' })
  })
})
