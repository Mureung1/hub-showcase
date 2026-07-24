import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { RESOURCE_UPLOAD } from '@teamflow/shared'

import { createApp } from '../src/app.js'
import { TeamFlowConflictError } from '../src/teamflow/teamFlowRepository.js'

const userId = '11111111-1111-4111-8111-111111111111'
const projectId = '22222222-2222-4222-8222-222222222222'
const memberId = '33333333-3333-4333-8333-333333333333'
const taskId = '44444444-4444-4444-8444-444444444444'
const invitationId = '55555555-5555-4555-8555-555555555555'
const noteId = '66666666-6666-4666-8666-666666666666'
const resourceId = '77777777-7777-4777-8777-777777777777'
const blockedMemberId = '88888888-8888-4888-8888-888888888888'
const aiMemberId = '99999999-9999-4999-8999-999999999999'
const aiRunId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const project = {
  id: projectId,
  name: '실제 프로젝트',
  description: '',
  status: 'in_progress',
  iconKey: 'layers',
  startDate: '2026-07-21',
  endDate: '2026-07-31',
  memberIds: [memberId],
  creatorId: memberId,
}

const member = {
  id: memberId,
  projectId,
  authUserId: userId,
  email: 'user@example.com',
  kind: 'user',
  name: '이주환',
  initial: '이',
  role: '프로젝트 생성자',
  description: '',
  color: '#3a6898',
  isAi: false,
}

const aiMember = {
  id: aiMemberId,
  projectId,
  authUserId: null,
  email: null,
  kind: 'ai',
  name: '자료조사 AI',
  initial: 'AI',
  role: '자료 조사',
  description: '',
  color: '#6950b8',
  isAi: true,
}

const contextConfig = {
  project: true,
  notes: true,
  tasks: true,
  team: false,
  resources: true,
}

const aiAgent = {
  memberId: aiMemberId,
  projectId,
  instructions: '신뢰할 수 있는 자료를 구조화해 주세요.',
  contextConfig,
  enabled: true,
  createdAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
}

const aiRun = {
  id: aiRunId,
  projectId,
  aiMemberId,
  taskId,
  status: 'pending_review',
  contextSnapshot: { version: 1, task: { id: taskId, title: '인증 API 테스트' } },
  resultMarkdown: '# 모의 실행 결과',
  errorMessage: null,
  appliedNoteId: null,
  createdBy: userId,
  createdAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
}

const task = {
  id: taskId,
  projectId,
  title: '인증 API 테스트',
  assigneeId: memberId,
  dueDate: '2026-07-30',
  status: 'not_started',
  description: '',
}

const invitation = {
  id: invitationId,
  projectId,
  projectName: project.name,
  inviteeEmail: 'friend@example.com',
  invitedBy: userId,
  inviterName: member.name,
  status: 'pending',
  direction: 'sent',
  createdAt: '2026-07-22T00:00:00.000Z',
  respondedAt: null,
}

const note = {
  id: noteId,
  projectId,
  title: '회의 노트',
  content: '# 회의',
  authorId: memberId,
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
}

const resource = {
  id: resourceId,
  projectId,
  parentId: null,
  type: 'link',
  name: '디자인 링크',
  description: '',
  url: 'https://example.com/design',
  ownerId: memberId,
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
}

const uploadedResource = {
  ...resource,
  type: 'document',
  name: '분기 보고서',
  url: null,
  storagePath: `${projectId}/${resourceId}`,
  originalName: 'report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  uploadStatus: 'pending',
}

const bootstrap = {
  projects: [project],
  members: [member],
  tasks: [task],
  notes: [note],
  resources: [resource],
  invitations: [invitation],
  currentMemberIdsByProject: { [projectId]: memberId },
  aiAgents: [aiAgent],
  aiRuns: [aiRun],
  currentUserId: memberId,
  accessMode: 'authenticated',
  capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: true },
}

const repository = {
  load: async () => bootstrap,
  listInvitations: async () => [invitation],
  createInvitation: async (_projectId, input) => ({ ...invitation, inviteeEmail: input.email }),
  acceptInvitation: async () => ({ projectId, memberId }),
  rejectInvitation: async () => ({ ...invitation, status: 'rejected' }),
  cancelInvitation: async () => ({ ...invitation, status: 'cancelled' }),
  createProject: async (input) => ({ ...project, ...input }),
  updateProject: async (_id, patch) => ({ ...project, ...patch }),
  deleteProject: async () => projectId,
  updateMember: async (_id, input) => ({ ...member, ...input }),
  deleteMember: async (id) => {
    if (id === blockedMemberId) throw new TeamFlowConflictError('마지막 협업자는 프로젝트에서 제거할 수 없습니다.')
    return id
  },
  createTask: async (input) => ({ ...task, ...input, isNew: true }),
  updateTask: async (_id, patch) => ({ ...task, ...patch }),
  deleteTask: async () => taskId,
  createNote: async (_projectId, input) => ({ ...note, ...input }),
  updateNote: async (_id, patch) => ({ ...note, ...patch }),
  deleteNote: async () => noteId,
  createResource: async (_projectId, input) => ({ ...resource, ...input }),
  createResourceUpload: async (_projectId, input) => ({
    resource: { ...uploadedResource, ...input },
    upload: {
      bucket: RESOURCE_UPLOAD.BUCKET,
      path: uploadedResource.storagePath,
      token: 'signed-upload-token',
    },
  }),
  completeResourceUpload: async () => ({ ...uploadedResource, uploadStatus: 'ready' }),
  createResourceDownloadUrl: async () => ({
    url: 'https://storage.example.com/signed-download',
    expiresIn: 60,
  }),
  updateResource: async (_id, patch) => ({ ...resource, ...patch }),
  deleteResource: async () => resourceId,
  createAiAgent: async () => ({ member: aiMember, aiAgent }),
  updateAiAgent: async (_id, input) => ({ ...aiAgent, ...input }),
  createAiRun: async () => aiRun,
  applyAiRun: async () => ({
    aiRun: { ...aiRun, status: 'applied', appliedNoteId: noteId },
    note: { ...note, id: noteId, title: `AI 결과 · ${task.title}`, content: aiRun.resultMarkdown },
  }),
  rejectAiRun: async () => ({ ...aiRun, status: 'rejected' }),
}

const app = createApp({
  authVerifier: {
    verify: async (token) => {
      if (token !== 'valid-token') throw new Error('invalid')
      return { id: userId, email: 'user@example.com', displayName: '이주환', avatarUrl: null }
    },
  },
  repositoryFactory: () => repository,
  demoRepository: {
    loadDemo: async () => ({ ...bootstrap, accessMode: 'guest' }),
  },
})

let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

const auth = { authorization: 'Bearer valid-token' }

function request(path, { method = 'GET', body } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...auth, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

test('demo is public while user bootstrap requires a valid token', async () => {
  const demoResponse = await fetch(`${baseUrl}/api/demo`)
  assert.equal(demoResponse.status, 200)
  assert.equal((await demoResponse.json()).accessMode, 'guest')

  assert.equal((await fetch(`${baseUrl}/api/bootstrap`)).status, 401)
  assert.equal((await fetch(`${baseUrl}/api/bootstrap`, { headers: { authorization: 'Bearer invalid' } })).status, 401)

  const response = await request('/api/bootstrap')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), bootstrap)
})

test('project invitations can be listed, created, accepted, rejected and cancelled', async () => {
  const listResponse = await request('/api/invitations')
  assert.equal(listResponse.status, 200)
  assert.deepEqual((await listResponse.json()).invitations, [invitation])

  const createResponse = await request(`/api/projects/${projectId}/invitations`, {
    method: 'POST',
    body: { inviteeEmail: ' Friend@Example.com ' },
  })
  assert.equal(createResponse.status, 201)
  assert.equal((await createResponse.json()).invitation.inviteeEmail, 'friend@example.com')

  const acceptResponse = await request(`/api/invitations/${invitationId}/accept`, { method: 'POST' })
  assert.equal(acceptResponse.status, 200)
  assert.deepEqual((await acceptResponse.json()).result, { projectId, memberId })

  const rejectResponse = await request(`/api/invitations/${invitationId}/reject`, { method: 'POST' })
  assert.equal(rejectResponse.status, 200)
  assert.equal((await rejectResponse.json()).invitationId, invitationId)

  const cancelResponse = await request(`/api/invitations/${invitationId}`, { method: 'DELETE' })
  assert.equal(cancelResponse.status, 200)
  assert.equal((await cancelResponse.json()).invitationId, invitationId)

  assert.equal((await request(`/api/projects/${projectId}/invitations`, { method: 'POST', body: { email: 'invalid' } })).status, 400)
})

test('projects can be fully updated and deleted', async () => {
  const createResponse = await request('/api/projects', {
    method: 'POST',
    body: {
      name: ' 실제 프로젝트 ', description: '', status: 'in_progress', startDate: '2026-07-21', endDate: '2026-07-31',
    },
  })
  assert.equal(createResponse.status, 201)
  assert.equal((await createResponse.json()).project.name, '실제 프로젝트')

  const updateResponse = await request(`/api/projects/${projectId}`, {
    method: 'PATCH',
    body: { name: '수정 프로젝트', description: '수정됨', status: 'completed' },
  })
  assert.equal(updateResponse.status, 200)
  assert.equal((await updateResponse.json()).project.name, '수정 프로젝트')

  const iconResponse = await request(`/api/projects/${projectId}`, {
    method: 'PATCH', body: { iconKey: 'rocket' },
  })
  assert.equal(iconResponse.status, 200)
  assert.equal((await iconResponse.json()).project.iconKey, 'rocket')
  assert.equal((await request(`/api/projects/${projectId}`, { method: 'PATCH', body: { iconKey: 'unknown' } })).status, 400)

  const invalidPeriod = await request(`/api/projects/${projectId}`, {
    method: 'PATCH', body: { startDate: '2026-08-01', endDate: '2026-07-31' },
  })
  assert.equal(invalidPeriod.status, 400)

  const deleteResponse = await request(`/api/projects/${projectId}`, { method: 'DELETE' })
  assert.equal(deleteResponse.status, 200)
  assert.deepEqual(await deleteResponse.json(), { projectId })
})

test('collaborators can update their project details and leave, but the last collaborator cannot be removed', async () => {
  const updateResponse = await request(`/api/members/${memberId}`, {
    method: 'PATCH', body: { role: '백엔드 개발', description: '', color: '#3a6898' },
  })
  assert.equal(updateResponse.status, 200)
  assert.equal((await updateResponse.json()).member.role, '백엔드 개발')

  const deleteResponse = await request(`/api/members/${memberId}`, { method: 'DELETE' })
  assert.equal(deleteResponse.status, 200)
  assert.deepEqual(await deleteResponse.json(), { memberId })

  const conflictResponse = await request(`/api/members/${blockedMemberId}`, { method: 'DELETE' })
  assert.equal(conflictResponse.status, 409)
  assert.equal((await conflictResponse.json()).error.code, 'CONFLICT')
})

test('manual assignee creation route is unavailable', async () => {
  const response = await request(`/api/projects/${projectId}/members`, {
    method: 'POST',
    body: { name: '더 이상 생성할 수 없는 담당자', initial: '담', role: '개발', description: '', color: '#3a6898' },
  })
  assert.equal(response.status, 404)
})

test('tasks can be created, fully or partially updated, and deleted', async () => {
  const createResponse = await request('/api/tasks', {
    method: 'POST',
    body: {
      projectId, title: ' 인증 API 테스트 ', assigneeId: memberId, dueDate: '2026-07-30', status: 'not_started', description: '',
    },
  })
  assert.equal(createResponse.status, 201)
  assert.equal((await createResponse.json()).task.title, '인증 API 테스트')

  const statusResponse = await request(`/api/tasks/${taskId}`, {
    method: 'PATCH', body: { status: 'in_progress' },
  })
  assert.equal(statusResponse.status, 200)
  assert.equal((await statusResponse.json()).task.status, 'in_progress')

  const fullResponse = await request(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: { title: '전체 수정', assigneeId: memberId, dueDate: '2026-08-01', status: 'in_review', description: '검토 중' },
  })
  assert.equal(fullResponse.status, 200)
  assert.equal((await fullResponse.json()).task.title, '전체 수정')
  assert.equal((await request(`/api/tasks/${taskId}`, { method: 'PATCH', body: {} })).status, 400)

  const deleteResponse = await request(`/api/tasks/${taskId}`, { method: 'DELETE' })
  assert.equal(deleteResponse.status, 200)
  assert.deepEqual(await deleteResponse.json(), { taskId })
})

test('mock AI teammate can be created, configured, run and reviewed', async () => {
  const createResponse = await request(`/api/projects/${projectId}/ai-agent`, { method: 'POST' })
  assert.equal(createResponse.status, 201)
  assert.deepEqual(await createResponse.json(), { member: aiMember, aiAgent })

  const settingsResponse = await request(`/api/ai-agents/${aiMemberId}`, {
    method: 'PATCH',
    body: {
      instructions: '신뢰할 수 있는 자료를 구조화해 주세요.',
      contextConfig,
    },
  })
  assert.equal(settingsResponse.status, 200)
  assert.deepEqual(await settingsResponse.json(), { aiAgent })

  const runResponse = await request(`/api/ai-agents/${aiMemberId}/runs`, {
    method: 'POST',
    body: { taskId },
  })
  assert.equal(runResponse.status, 201)
  assert.deepEqual(await runResponse.json(), { aiRun })

  const applyResponse = await request(`/api/ai-runs/${aiRunId}/apply`, { method: 'POST' })
  assert.equal(applyResponse.status, 200)
  assert.equal((await applyResponse.json()).aiRun.status, 'applied')

  const rejectResponse = await request(`/api/ai-runs/${aiRunId}/reject`, { method: 'POST' })
  assert.equal(rejectResponse.status, 200)
  assert.equal((await rejectResponse.json()).aiRun.status, 'rejected')
})

test('mock AI routes reject invalid ids and malformed settings before repository access', async () => {
  assert.equal((await request('/api/projects/not-a-uuid/ai-agent', { method: 'POST' })).status, 400)
  assert.equal((await request('/api/ai-agents/not-a-uuid', {
    method: 'PATCH',
    body: { instructions: '', contextConfig },
  })).status, 400)
  assert.equal((await request(`/api/ai-agents/${aiMemberId}`, {
    method: 'PATCH',
    body: {
      instructions: 'x'.repeat(10_001),
      contextConfig,
    },
  })).status, 400)
  assert.equal((await request(`/api/ai-agents/${aiMemberId}`, {
    method: 'PATCH',
    body: {
      instructions: '',
      contextConfig: { ...contextConfig, unexpected: true },
    },
  })).status, 400)
  assert.equal((await request(`/api/ai-agents/${aiMemberId}/runs`, {
    method: 'POST',
    body: { taskId: 'not-a-uuid' },
  })).status, 400)
  assert.equal((await request('/api/ai-runs/not-a-uuid/apply', { method: 'POST' })).status, 400)
})

test('shared notes support create, partial update and delete', async () => {
  const createResponse = await request(`/api/projects/${projectId}/notes`, {
    method: 'POST', body: { title: ' 회의 노트 ', content: '# 회의' },
  })
  assert.equal(createResponse.status, 201)
  assert.equal((await createResponse.json()).note.title, '회의 노트')

  const updateResponse = await request(`/api/notes/${noteId}`, {
    method: 'PATCH', body: { content: '# 변경된 회의' },
  })
  assert.equal(updateResponse.status, 200)
  assert.equal((await updateResponse.json()).note.content, '# 변경된 회의')
  assert.equal((await request(`/api/notes/${noteId}`, { method: 'PATCH', body: {} })).status, 400)

  const deleteResponse = await request(`/api/notes/${noteId}`, { method: 'DELETE' })
  assert.equal(deleteResponse.status, 200)
  assert.deepEqual(await deleteResponse.json(), { noteId })
})

test('shared notes accept the full Unicode content limit before validation', async () => {
  const maximumContent = '한'.repeat(100_000)
  const acceptedResponse = await request(`/api/projects/${projectId}/notes`, {
    method: 'POST', body: { title: '긴 노트', content: maximumContent },
  })
  assert.equal(acceptedResponse.status, 201)

  const rejectedResponse = await request(`/api/projects/${projectId}/notes`, {
    method: 'POST', body: { title: '너무 긴 노트', content: `${maximumContent}한` },
  })
  assert.equal(rejectedResponse.status, 400)
})

test('resource metadata validates links and supports create, update and delete', async () => {
  const invalidLink = await request(`/api/projects/${projectId}/resources`, {
    method: 'POST', body: { name: '잘못된 링크', type: 'link', description: '', parentId: null, url: 'javascript:alert(1)' },
  })
  assert.equal(invalidLink.status, 400)

  const createResponse = await request(`/api/projects/${projectId}/resources`, {
    method: 'POST', body: { name: ' 디자인 링크 ', type: 'link', description: '', parentId: null, url: 'https://example.com/design' },
  })
  assert.equal(createResponse.status, 201)
  assert.equal((await createResponse.json()).resource.name, '디자인 링크')

  const updateResponse = await request(`/api/resources/${resourceId}`, {
    method: 'PATCH', body: { name: '새 디자인 링크', parentId: null },
  })
  assert.equal(updateResponse.status, 200)
  assert.equal((await updateResponse.json()).resource.name, '새 디자인 링크')

  const invalidFolder = await request(`/api/projects/${projectId}/resources`, {
    method: 'POST', body: { name: '하위 폴더', type: 'folder', description: '', parentId: resourceId, url: null },
  })
  assert.equal(invalidFolder.status, 400)

  const deleteResponse = await request(`/api/resources/${resourceId}`, { method: 'DELETE' })
  assert.equal(deleteResponse.status, 200)
  assert.deepEqual(await deleteResponse.json(), { resourceId })
})

test('private resource uploads support intent, completion and signed downloads', async () => {
  const intentResponse = await request(`/api/projects/${projectId}/resource-uploads`, {
    method: 'POST',
    body: {
      name: ' 분기 보고서 ',
      description: '',
      parentId: null,
      originalName: ' report/2026\tQ3.pdf ',
      mimeType: 'APPLICATION/PDF',
      sizeBytes: 1024,
    },
  })
  assert.equal(intentResponse.status, 201)
  const intent = await intentResponse.json()
  assert.equal(intent.resource.name, '분기 보고서')
  assert.equal(intent.resource.originalName, 'report_2026_Q3.pdf')
  assert.equal(intent.resource.mimeType, 'application/pdf')
  assert.equal(intent.resource.type, 'document')
  assert.deepEqual(intent.upload, {
    bucket: RESOURCE_UPLOAD.BUCKET,
    path: uploadedResource.storagePath,
    token: 'signed-upload-token',
  })

  const completionResponse = await request(`/api/resources/${resourceId}/complete-upload`, { method: 'POST' })
  assert.equal(completionResponse.status, 200)
  assert.equal((await completionResponse.json()).resource.uploadStatus, 'ready')

  const downloadResponse = await request(`/api/resources/${resourceId}/download-url`, { method: 'POST' })
  assert.equal(downloadResponse.status, 200)
  assert.deepEqual(await downloadResponse.json(), {
    url: 'https://storage.example.com/signed-download',
    expiresIn: 60,
  })
})

test('private resource uploads reject missing, empty and oversized file sizes', async () => {
  for (const sizeBytes of [undefined, 0, RESOURCE_UPLOAD.MAX_BYTES + 1]) {
    const response = await request(`/api/projects/${projectId}/resource-uploads`, {
      method: 'POST',
      body: {
        name: '분기 보고서',
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
        ...(sizeBytes === undefined ? {} : { sizeBytes }),
      },
    })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR')
  }
})
