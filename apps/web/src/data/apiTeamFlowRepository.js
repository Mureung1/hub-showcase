import { mockTeamFlowRepository } from './mockTeamFlowRepository.js'

export class TeamFlowApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TeamFlowApiError'
  }
}

async function readJson(response, fallbackMessage) {
  if (!response.ok) {
    throw new TeamFlowApiError(fallbackMessage)
  }

  try {
    return await response.json()
  } catch {
    throw new TeamFlowApiError('API 응답을 읽을 수 없습니다.')
  }
}

async function requestJson(fetchImpl, url, options, fallbackMessage) {
  let response

  try {
    response = options === undefined
      ? await fetchImpl(url)
      : await fetchImpl(url, options)
  } catch {
    throw new TeamFlowApiError(fallbackMessage)
  }

  return readJson(response, fallbackMessage)
}

export function createApiTeamFlowRepository({
  fetchImpl = globalThis.fetch,
  mockRepository = mockTeamFlowRepository,
} = {}) {
  return {
    ...mockRepository,

    async load() {
      const [mockPayload, payload] = await Promise.all([
        mockRepository.load(),
        requestJson(fetchImpl, '/api/tasks', undefined, '저장된 할 일을 불러오지 못했습니다.'),
      ])

      if (!Array.isArray(payload.tasks)) {
        throw new TeamFlowApiError('할 일 목록 응답 형식이 올바르지 않습니다.')
      }

      const persistedTaskIds = new Set(payload.tasks.map((task) => task.id))

      return {
        ...mockPayload,
        tasks: [
          ...payload.tasks,
          ...mockPayload.tasks.filter((task) => !persistedTaskIds.has(task.id)),
        ],
      }
    },

    async createTask(projectId, input) {
      const payload = await requestJson(fetchImpl, '/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId, ...input }),
      }, '할 일을 저장하지 못했습니다.')

      if (!payload.task?.id) {
        throw new TeamFlowApiError('할 일 생성 응답 형식이 올바르지 않습니다.')
      }

      return payload.task
    },
  }
}

export const apiTeamFlowRepository = createApiTeamFlowRepository()
