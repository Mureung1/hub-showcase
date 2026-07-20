import { describe, expect, test, vi } from 'vitest'

import {
  createApiTeamFlowRepository,
  TeamFlowApiError,
} from './apiTeamFlowRepository.js'

const persistedTask = {
  id: 'persisted-task',
  projectId: '1',
  title: '새로고침 후 유지',
  assigneeId: 'member-1',
  dueDate: '2026-07-25',
  status: 'not_started',
  description: '',
}

const mockPayload = {
  projects: [],
  members: [],
  tasks: [
    { ...persistedTask, title: '중복 mock' },
    { id: 'mock-task', title: '기존 mock' },
  ],
  notes: [],
  resources: [],
  aiSettings: {},
  currentUserId: '',
  aiMemberId: '',
}

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body }
}

describe('apiTeamFlowRepository', () => {
  test('loads persisted tasks before mock tasks and removes duplicate ids', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ tasks: [persistedTask] }))
    const repository = createApiTeamFlowRepository({
      fetchImpl,
      mockRepository: { load: async () => structuredClone(mockPayload) },
    })

    const result = await repository.load()

    expect(fetchImpl).toHaveBeenCalledWith('/api/tasks')
    expect(result.tasks.map((task) => task.id)).toEqual(['persisted-task', 'mock-task'])
    expect(result.tasks[0].title).toBe('새로고침 후 유지')
  })

  test('creates a task through the Express API', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ task: persistedTask }))
    const repository = createApiTeamFlowRepository({
      fetchImpl,
      mockRepository: { load: async () => structuredClone(mockPayload) },
    })

    const task = await repository.createTask('1', {
      title: '새로고침 후 유지',
      assigneeId: 'member-1',
      dueDate: '2026-07-25',
      status: 'not_started',
      description: '',
    })

    expect(task).toEqual(persistedTask)
    expect(fetchImpl).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"projectId":"1"'),
    }))
  })

  test('throws a user-safe error when the API is unavailable', async () => {
    const repository = createApiTeamFlowRepository({
      fetchImpl: vi.fn(async () => jsonResponse({}, false)),
      mockRepository: { load: async () => structuredClone(mockPayload) },
    })

    await expect(repository.load()).rejects.toBeInstanceOf(TeamFlowApiError)
    await expect(repository.load()).rejects.toThrow('저장된 할 일을 불러오지 못했습니다.')
  })

  test('converts a network rejection into a user-safe error', async () => {
    const repository = createApiTeamFlowRepository({
      fetchImpl: vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
      mockRepository: { load: async () => structuredClone(mockPayload) },
    })

    await expect(repository.load()).rejects.toThrow('저장된 할 일을 불러오지 못했습니다.')
  })
})
