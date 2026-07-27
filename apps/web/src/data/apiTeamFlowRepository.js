export class TeamFlowApiError extends Error {
  constructor(message, code = 'TEAMFLOW_API_ERROR', aiRun = null, task = null) {
    super(message)
    this.name = 'TeamFlowApiError'
    this.code = code
    this.aiRun = aiRun
    this.task = task
  }
}

function normalizeApiBaseUrl(value = '') {
  const candidate = value.trim()
  if (!candidate) return ''

  let url
  try {
    url = new URL(candidate)
  } catch {
    throw new TeamFlowApiError('TeamFlow API 주소가 올바르지 않습니다.', 'INVALID_API_URL')
  }

  if (!['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
    || (url.pathname !== '/' && url.pathname !== '')) {
    throw new TeamFlowApiError('TeamFlow API 주소에는 http(s) origin만 사용할 수 있습니다.', 'INVALID_API_URL')
  }

  return url.origin
}

function apiUrl(baseUrl, path) {
  return `${baseUrl}${path}`
}

async function readJson(response, fallbackMessage) {
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new TeamFlowApiError(response.ok ? 'API 응답을 읽을 수 없습니다.' : fallbackMessage)
  }

  if (!response.ok) {
    throw new TeamFlowApiError(
      payload?.error?.message || fallbackMessage,
      payload?.error?.code,
      payload?.aiRun ?? null,
      payload?.task ?? null,
    )
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

export function createApiTeamFlowRepository({
  fetchImpl = globalThis.fetch,
  getAccessToken,
  uploadToSignedUrl,
  apiBaseUrl = '',
} = {}) {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl)

  async function authenticatedRequest(path, options, fallbackMessage) {
    const token = await getAccessToken?.()
    if (!token) throw new TeamFlowApiError('로그인이 만료되었습니다. 다시 로그인해 주세요.', 'AUTH_REQUIRED')
    const headers = {
      authorization: `Bearer ${token}`,
      ...(options?.body ? { 'content-type': 'application/json' } : {}),
      ...options?.headers,
    }
    return requestJson(fetchImpl, apiUrl(baseUrl, path), { ...options, headers }, fallbackMessage)
  }

  async function cleanupPendingResource(resourceId) {
    try {
      await authenticatedRequest(`/api/resources/${resourceId}`, { method: 'DELETE' }, '업로드 준비 자료를 정리하지 못했습니다.')
    } catch {
      // The pending row stays hidden from normal loading and can be retried or
      // removed with the project if this immediate cleanup also fails.
    }
  }

  return {
    refreshOnEntry: true,
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

    async deleteProject(projectId) {
      const payload = await authenticatedRequest(`/api/projects/${projectId}`, {
        method: 'DELETE',
      }, '프로젝트를 삭제하지 못했습니다.')
      return { projectId: payload.projectId }
    },

    async updateMember(memberId, patch) {
      const payload = await authenticatedRequest(`/api/members/${memberId}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      }, '협업자 정보를 수정하지 못했습니다.')
      return { memberId, patch: payload.member }
    },

    async deleteMember(memberId) {
      const payload = await authenticatedRequest(`/api/members/${memberId}`, {
        method: 'DELETE',
      }, '협업자를 제거하지 못했습니다.')
      return {
        memberId: payload.memberId,
        projectId: payload.projectId,
        wasCollaborator: Boolean(payload.wasCollaborator),
      }
    },

    async createInvitation(projectId, input) {
      const payload = await authenticatedRequest(`/api/projects/${projectId}/invitations`, {
        method: 'POST', body: JSON.stringify(input),
      }, '프로젝트 초대를 만들지 못했습니다.')
      return payload.invitation
    },

    async acceptInvitation(invitationId) {
      return authenticatedRequest(`/api/invitations/${invitationId}/accept`, {
        method: 'POST',
      }, '프로젝트 초대를 수락하지 못했습니다.')
    },

    async rejectInvitation(invitationId) {
      const payload = await authenticatedRequest(`/api/invitations/${invitationId}/reject`, {
        method: 'POST',
      }, '프로젝트 초대를 거절하지 못했습니다.')
      return { invitationId: payload.invitationId ?? invitationId }
    },

    async cancelInvitation(invitationId) {
      const payload = await authenticatedRequest(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      }, '프로젝트 초대를 취소하지 못했습니다.')
      return { invitationId: payload.invitationId ?? invitationId }
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
      }, '할 일을 수정하지 못했습니다.')
      return { taskId, patch: payload.task }
    },

    async deleteTask(taskId) {
      const payload = await authenticatedRequest(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      }, '할 일을 삭제하지 못했습니다.')
      return { taskId: payload.taskId }
    },

    async createNote(projectId, input) {
      const payload = await authenticatedRequest(`/api/projects/${projectId}/notes`, {
        method: 'POST', body: JSON.stringify(input),
      }, '노트를 만들지 못했습니다.')
      return payload.note
    },

    async updateNote(noteId, patch) {
      const payload = await authenticatedRequest(`/api/notes/${noteId}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      }, '노트를 저장하지 못했습니다.')
      return { noteId, patch: payload.note }
    },

    async deleteNote(noteId) {
      const payload = await authenticatedRequest(`/api/notes/${noteId}`, {
        method: 'DELETE',
      }, '노트를 삭제하지 못했습니다.')
      return { noteId: payload.noteId ?? noteId }
    },

    async createResource(projectId, input) {
      const payload = await authenticatedRequest(`/api/projects/${projectId}/resources`, {
        method: 'POST', body: JSON.stringify(input),
      }, '자료를 만들지 못했습니다.')
      return payload.resource
    },

    async uploadResource(projectId, { file, ...input }) {
      if (!file) throw new TeamFlowApiError('업로드할 파일을 선택해 주세요.', 'FILE_REQUIRED')
      if (typeof uploadToSignedUrl !== 'function') {
        throw new TeamFlowApiError('파일 업로드 기능을 초기화하지 못했습니다. 페이지를 새로고침해 주세요.', 'UPLOAD_UNAVAILABLE')
      }

      const intent = await authenticatedRequest(`/api/projects/${projectId}/resource-uploads`, {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        }),
      }, '파일 업로드를 준비하지 못했습니다.')

      try {
        await uploadToSignedUrl({ ...intent.upload, file })
      } catch (error) {
        await cleanupPendingResource(intent.resource.id)
        throw error instanceof TeamFlowApiError
          ? error
          : new TeamFlowApiError('파일을 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'UPLOAD_FAILED')
      }

      try {
        const completed = await authenticatedRequest(`/api/resources/${intent.resource.id}/complete-upload`, {
          method: 'POST',
        }, '파일 업로드를 완료하지 못했습니다.')
        return completed.resource
      } catch (error) {
        await cleanupPendingResource(intent.resource.id)
        throw error
      }
    },

    async updateResource(resourceId, patch) {
      const payload = await authenticatedRequest(`/api/resources/${resourceId}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      }, '자료를 수정하지 못했습니다.')
      return { resourceId, patch: payload.resource }
    },

    async deleteResource(resourceId) {
      const payload = await authenticatedRequest(`/api/resources/${resourceId}`, {
        method: 'DELETE',
      }, '자료를 삭제하지 못했습니다.')
      return { resourceId: payload.resourceId ?? resourceId }
    },

    async getResourceDownloadUrl(resourceId) {
      return authenticatedRequest(`/api/resources/${resourceId}/download-url`, {
        method: 'POST',
      }, '파일 다운로드를 준비하지 못했습니다.')
    },

    async createAiAgent(projectId, input) {
      return authenticatedRequest(`/api/projects/${projectId}/ai-agents`, {
        method: 'POST', body: JSON.stringify(input),
      }, 'AI 팀원을 추가하지 못했습니다.')
    },

    async updateAiAgent(memberId, input) {
      const payload = await authenticatedRequest(`/api/ai-agents/${memberId}`, {
        method: 'PATCH', body: JSON.stringify(input),
      }, 'AI 팀원 설정을 저장하지 못했습니다.')
      return { member: payload.member, aiAgent: payload.aiAgent }
    },

    async createAiRun(memberId, taskId) {
      const payload = await authenticatedRequest(`/api/ai-agents/${memberId}/runs`, {
        method: 'POST', body: JSON.stringify({ taskId }),
      }, 'AI 작업을 실행하지 못했습니다.')
      return { aiRun: payload.aiRun, task: payload.task ?? null }
    },

    async applyAiRun(runId) {
      return authenticatedRequest(`/api/ai-runs/${runId}/apply`, {
        method: 'POST',
      }, 'AI 결과를 공유 노트에 반영하지 못했습니다.')
    },

    async rejectAiRun(runId) {
      const payload = await authenticatedRequest(`/api/ai-runs/${runId}/reject`, {
        method: 'POST',
      }, 'AI 결과를 보류하지 못했습니다.')
      return { aiRun: payload.aiRun, task: payload.task ?? null }
    },

    async getAiCredential() {
      const payload = await authenticatedRequest('/api/ai-credentials/gemini', undefined, 'Gemini API 키 상태를 확인하지 못했습니다.')
      return payload.credential
    },

    async saveAiCredential(input) {
      const payload = await authenticatedRequest('/api/ai-credentials/gemini', {
        method: 'PUT', body: JSON.stringify(input),
      }, 'Gemini API 키를 연결하지 못했습니다.')
      return payload.credential
    },

    async deleteAiCredential() {
      const payload = await authenticatedRequest('/api/ai-credentials/gemini', {
        method: 'DELETE',
      }, 'Gemini API 키를 삭제하지 못했습니다.')
      return payload.credential
    },
  }
}

export function createDemoTeamFlowRepository({
  fetchImpl = globalThis.fetch,
  apiBaseUrl = '',
} = {}) {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl)
  const readOnly = () => Promise.reject(new TeamFlowApiError('게스트 모드에서는 내용을 변경할 수 없습니다.', 'READ_ONLY'))
  return {
    refreshOnEntry: false,
    async load() {
      return requestJson(fetchImpl, apiUrl(baseUrl, '/api/demo'), undefined, '게스트 데모를 불러오지 못했습니다.')
    },
    createProject: readOnly,
    updateProject: readOnly,
    deleteProject: readOnly,
    updateMember: readOnly,
    deleteMember: readOnly,
    createInvitation: readOnly,
    acceptInvitation: readOnly,
    rejectInvitation: readOnly,
    cancelInvitation: readOnly,
    createTask: readOnly,
    updateTask: readOnly,
    deleteTask: readOnly,
    createNote: readOnly,
    updateNote: readOnly,
    deleteNote: readOnly,
    createResource: readOnly,
    uploadResource: readOnly,
    updateResource: readOnly,
    deleteResource: readOnly,
    getResourceDownloadUrl: readOnly,
    createAiAgent: readOnly,
    updateAiAgent: readOnly,
    createAiRun: readOnly,
    applyAiRun: readOnly,
    rejectAiRun: readOnly,
    getAiCredential: readOnly,
    saveAiCredential: readOnly,
    deleteAiCredential: readOnly,
  }
}
