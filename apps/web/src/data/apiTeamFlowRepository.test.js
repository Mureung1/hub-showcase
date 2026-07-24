import { describe, expect, test, vi } from 'vitest'

import {
  createApiTeamFlowRepository,
  createDemoTeamFlowRepository,
  TeamFlowApiError,
} from './apiTeamFlowRepository.js'

const bootstrap = {
  projects: [], members: [], tasks: [], notes: [], resources: [], aiAgents: [], aiRuns: [],
  currentUserId: 'member-1', accessMode: 'authenticated',
  capabilities: { projects: true, members: true, tasks: true, notes: false, resources: false, ai: true },
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

  test('connects every Mock AI command to its authenticated Express endpoint', async () => {
    const member = { id: 'ai-member-1', projectId: 'project-1', kind: 'ai', name: '시장 분석 Agent', role: '시장 조사' }
    const aiAgent = {
      memberId: member.id,
      projectId: member.projectId,
      instructions: '요약해 주세요.',
      contextConfig: { project: true, notes: true, tasks: true, team: false, resources: true },
    }
    const pending = { id: 'run-1', aiMemberId: member.id, taskId: 'task-1', status: 'pending_review' }
    const applied = { ...pending, status: 'applied', appliedNoteId: 'note-1' }
    const note = { id: 'note-1', projectId: 'project-1', title: 'AI 결과 · 테스트' }
    const createInput = {
      name: member.name,
      role: member.role,
      description: '시장 동향을 정리합니다.',
      instructions: aiAgent.instructions,
      contextConfig: aiAgent.contextConfig,
    }
    const fetchImpl = vi.fn(async (url) => {
      if (url.endsWith('/projects/project-1/ai-agents')) return jsonResponse({ member, aiAgent })
      if (url.endsWith('/ai-agents/ai-member-1') && !url.endsWith('/runs')) return jsonResponse({ member, aiAgent })
      if (url.endsWith('/ai-agents/ai-member-1/runs')) return jsonResponse({ aiRun: pending })
      if (url.endsWith('/ai-runs/run-1/apply')) return jsonResponse({ aiRun: applied, note })
      if (url.endsWith('/ai-runs/run-1/reject')) return jsonResponse({ aiRun: { ...pending, status: 'rejected' } })
      throw new Error(`Unexpected request: ${url}`)
    })
    const repository = createApiTeamFlowRepository({
      fetchImpl,
      getAccessToken: async () => 'access-token',
    })

    await expect(repository.createAiAgent('project-1', createInput)).resolves.toEqual({ member, aiAgent })
    await expect(repository.updateAiAgent(member.id, {
      instructions: aiAgent.instructions,
      contextConfig: aiAgent.contextConfig,
    })).resolves.toEqual({ member, aiAgent })
    await expect(repository.createAiRun(member.id, 'task-1')).resolves.toEqual(pending)
    await expect(repository.applyAiRun(pending.id)).resolves.toEqual({ aiRun: applied, note })
    await expect(repository.rejectAiRun(pending.id)).resolves.toMatchObject({
      id: pending.id,
      status: 'rejected',
    })

    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/projects/project-1/ai-agents', expect.objectContaining({
      method: 'POST',
      headers: { authorization: 'Bearer access-token', 'content-type': 'application/json' },
    }))
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(createInput)
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      instructions: aiAgent.instructions,
      contextConfig: aiAgent.contextConfig,
    })
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toEqual({ taskId: 'task-1' })
    expect(fetchImpl.mock.calls[3][1].method).toBe('POST')
    expect(fetchImpl.mock.calls[4][1].method).toBe('POST')
  })

  test('uploads a selected local file through the signed upload flow', async () => {
    const uploaded = {
      id: 'resource-1', projectId: 'project-1', name: 'report.pdf', type: 'document',
      storagePath: 'project-1/resource-1', originalName: 'report.pdf', mimeType: 'application/pdf',
      sizeBytes: 7, uploadStatus: 'ready',
    }
    const fetchImpl = vi.fn(async (url) => {
      if (url.endsWith('/resource-uploads')) {
        return jsonResponse({
          resource: { ...uploaded, uploadStatus: 'pending' },
          upload: { bucket: 'teamflow-resources', path: uploaded.storagePath, token: 'signed-token' },
        })
      }
      if (url.endsWith('/complete-upload')) return jsonResponse({ resource: uploaded })
      throw new Error(`Unexpected request: ${url}`)
    })
    const uploadToSignedUrl = vi.fn(async () => {})
    const repository = createApiTeamFlowRepository({
      fetchImpl,
      getAccessToken: async () => 'access-token',
      uploadToSignedUrl,
    })
    const file = new File(['content'], 'report.pdf', { type: 'application/pdf' })

    await expect(repository.uploadResource('project-1', {
      file,
      name: 'report.pdf',
      description: '분기 보고서',
      parentId: null,
    })).resolves.toEqual(uploaded)

    expect(uploadToSignedUrl).toHaveBeenCalledWith({
      bucket: 'teamflow-resources', path: 'project-1/resource-1', token: 'signed-token', file,
    })
    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/projects/project-1/resource-uploads', expect.objectContaining({ method: 'POST' }))
    expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/resources/resource-1/complete-upload', expect.objectContaining({ method: 'POST' }))
    const intent = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(intent).toMatchObject({ originalName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 7 })
  })

  test('cleans the pending resource when browser storage upload fails', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.endsWith('/resource-uploads')) {
        return jsonResponse({
          resource: { id: 'resource-1' },
          upload: { bucket: 'teamflow-resources', path: 'project-1/resource-1', token: 'signed-token' },
        })
      }
      if (url.endsWith('/resources/resource-1')) return jsonResponse({ resourceId: 'resource-1' })
      throw new Error(`Unexpected request: ${url}`)
    })
    const repository = createApiTeamFlowRepository({
      fetchImpl,
      getAccessToken: async () => 'access-token',
      uploadToSignedUrl: async () => { throw new Error('storage unavailable') },
    })

    await expect(repository.uploadResource('project-1', {
      file: new File(['content'], 'report.pdf', { type: 'application/pdf' }),
      name: 'report.pdf', description: '', parentId: null,
    })).rejects.toMatchObject({ code: 'UPLOAD_FAILED' })

    expect(fetchImpl).toHaveBeenLastCalledWith('/api/resources/resource-1', expect.objectContaining({ method: 'DELETE' }))
  })

  test('uses the configured Render API origin in production', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(bootstrap))
    const repository = createApiTeamFlowRepository({
      fetchImpl,
      getAccessToken: async () => 'access-token',
      apiBaseUrl: 'https://teamflow-api.onrender.com/',
    })

    await repository.load()
    expect(fetchImpl).toHaveBeenCalledWith('https://teamflow-api.onrender.com/api/bootstrap', {
      headers: { authorization: 'Bearer access-token' },
    })
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
    await expect(repository.createAiAgent('project-1')).rejects.toMatchObject({ code: 'READ_ONLY' })
    await expect(repository.updateAiAgent('ai-1', {})).rejects.toMatchObject({ code: 'READ_ONLY' })
    await expect(repository.createAiRun('ai-1', 'task-1')).rejects.toMatchObject({ code: 'READ_ONLY' })
    await expect(repository.applyAiRun('run-1')).rejects.toMatchObject({ code: 'READ_ONLY' })
    await expect(repository.rejectAiRun('run-1')).rejects.toMatchObject({ code: 'READ_ONLY' })
  })

  test('loads the demo from the configured Render API origin', async () => {
    const demo = { ...bootstrap, accessMode: 'guest' }
    const fetchImpl = vi.fn(async () => jsonResponse(demo))
    const repository = createDemoTeamFlowRepository({
      fetchImpl,
      apiBaseUrl: 'https://teamflow-api.onrender.com/',
    })

    await repository.load()
    expect(fetchImpl).toHaveBeenCalledWith('https://teamflow-api.onrender.com/api/demo', undefined)
  })
})
