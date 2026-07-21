export class TeamFlowApiError extends Error {
  constructor(message, code = 'TEAMFLOW_API_ERROR') {
    super(message)
    this.name = 'TeamFlowApiError'
    this.code = code
  }
}

async function readJson(response, fallbackMessage) {
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new TeamFlowApiError(response.ok ? 'API 응답을 읽을 수 없습니다.' : fallbackMessage)
  }

  if (!response.ok) {
    throw new TeamFlowApiError(payload?.error?.message || fallbackMessage, payload?.error?.code)
  }
  return payload
}

async function requestJson(fetchImpl, url, options, fallbackMessage) {
  let response
  try {
    response = await fetchImpl(url, options)
  } catch {
    throw new TeamFlowApiError(fallbackMessage)
  }
  return readJson(response, fallbackMessage)
}

function unsupportedFeature() {
  throw new TeamFlowApiError('이 기능은 다음 영속화 단계에서 제공됩니다.', 'FEATURE_NOT_AVAILABLE')
}

export function createApiTeamFlowRepository({
  fetchImpl = globalThis.fetch,
  getAccessToken,
} = {}) {
  async function authenticatedRequest(url, options, fallbackMessage) {
    const token = await getAccessToken?.()
    if (!token) throw new TeamFlowApiError('로그인이 만료되었습니다. 다시 로그인해 주세요.', 'AUTH_REQUIRED')
    const headers = {
      authorization: `Bearer ${token}`,
      ...(options?.body ? { 'content-type': 'application/json' } : {}),
      ...options?.headers,
    }
    return requestJson(fetchImpl, url, { ...options, headers }, fallbackMessage)
  }

  return {
    async load() {
      return authenticatedRequest('/api/bootstrap', undefined, 'TeamFlow 데이터를 불러오지 못했습니다.')
    },

    async createProject(input) {
      const payload = await authenticatedRequest('/api/projects', {
        method: 'POST', body: JSON.stringify(input),
      }, '프로젝트를 만들지 못했습니다.')
      return payload.project
    },

    async updateProject(projectId, patch) {
      const payload = await authenticatedRequest(`/api/projects/${projectId}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      }, '프로젝트를 수정하지 못했습니다.')
      return { projectId, patch: payload.project }
    },

    async createMember(projectId, input) {
      const payload = await authenticatedRequest(`/api/projects/${projectId}/members`, {
        method: 'POST', body: JSON.stringify(input),
      }, '팀원을 추가하지 못했습니다.')
      return { projectId, member: payload.member }
    },

    async createTask(projectId, input) {
      const payload = await authenticatedRequest('/api/tasks', {
        method: 'POST', body: JSON.stringify({ projectId, ...input }),
      }, '할 일을 저장하지 못했습니다.')
      return payload.task
    },

    async updateTask(taskId, patch) {
      const payload = await authenticatedRequest(`/api/tasks/${taskId}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      }, '할 일 상태를 변경하지 못했습니다.')
      return { taskId, patch: payload.task }
    },

    async deleteTask(taskId) {
      const payload = await authenticatedRequest(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      }, '할 일을 삭제하지 못했습니다.')
      return { taskId: payload.taskId }
    },

    createNote: unsupportedFeature,
    updateNote: unsupportedFeature,
    createResource: unsupportedFeature,
    updateAiSettings: unsupportedFeature,
  }
}

export function createDemoTeamFlowRepository({ fetchImpl = globalThis.fetch } = {}) {
  const readOnly = () => Promise.reject(new TeamFlowApiError('게스트 모드에서는 내용을 변경할 수 없습니다.', 'READ_ONLY'))
  return {
    async load() {
      return requestJson(fetchImpl, '/api/demo', undefined, '게스트 데모를 불러오지 못했습니다.')
    },
    createProject: readOnly,
    updateProject: readOnly,
    createMember: readOnly,
    createTask: readOnly,
    updateTask: readOnly,
    deleteTask: readOnly,
    createNote: readOnly,
    updateNote: readOnly,
    createResource: readOnly,
    updateAiSettings: readOnly,
  }
}
