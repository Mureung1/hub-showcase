import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { createApp } from '../src/app.js'

const userId = '11111111-1111-4111-8111-111111111111'
const projectId = '22222222-2222-4222-8222-222222222222'
const memberId = '33333333-3333-4333-8333-333333333333'
const taskId = '44444444-4444-4444-8444-444444444444'

const project = {
  id: projectId,
  name: '실제 프로젝트',
  description: '',
  status: 'in_progress',
  startDate: '2026-07-21',
  endDate: '2026-07-31',
  memberIds: [memberId],
  creatorId: memberId,
}

const member = {
  id: memberId,
  name: '이주환',
  initial: '이',
  role: '프로젝트 생성자',
  description: '',
  color: '#3a6898',
  isAi: false,
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

const bootstrap = {
  projects: [project],
  members: [member],
  tasks: [task],
  notes: [],
  resources: [],
  aiSettings: {},
  aiHistory: [],
  currentUserId: memberId,
  aiMemberId: '',
  accessMode: 'authenticated',
  capabilities: { projects: true, members: true, tasks: true, notes: false, resources: false, ai: false },
}

const repository = {
  load: async () => bootstrap,
  createProject: async (input) => ({ ...project, ...input }),
  updateProject: async (_id, patch) => ({ ...project, ...patch }),
  createMember: async (_id, input) => ({ ...member, ...input }),
  createTask: async (input) => ({ ...task, ...input, isNew: true }),
  updateTask: async (_id, patch) => ({ ...task, ...patch }),
  deleteTask: async () => taskId,
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

test('demo is public while user bootstrap requires a valid token', async () => {
  const demoResponse = await fetch(`${baseUrl}/api/demo`)
  assert.equal(demoResponse.status, 200)
  assert.equal((await demoResponse.json()).accessMode, 'guest')

  assert.equal((await fetch(`${baseUrl}/api/bootstrap`)).status, 401)
  assert.equal((await fetch(`${baseUrl}/api/bootstrap`, { headers: { authorization: 'Bearer invalid' } })).status, 401)

  const response = await fetch(`${baseUrl}/api/bootstrap`, { headers: auth })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), bootstrap)
})

test('authenticated project and member endpoints validate and return data', async () => {
  const projectResponse = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({
      name: ' 실제 프로젝트 ', description: '', status: 'in_progress', startDate: '2026-07-21', endDate: '2026-07-31',
    }),
  })
  assert.equal(projectResponse.status, 201)
  assert.equal((await projectResponse.json()).project.name, '실제 프로젝트')

  const periodResponse = await fetch(`${baseUrl}/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: '2026-08-01', endDate: '2026-07-31' }),
  })
  assert.equal(periodResponse.status, 400)

  const memberResponse = await fetch(`${baseUrl}/api/projects/${projectId}/members`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: '박코덱스', initial: '박', role: '개발', description: '', color: '#3a6898' }),
  })
  assert.equal(memberResponse.status, 201)
})

test('authenticated task endpoints create, update and delete', async () => {
  const createResponse = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({
      projectId, title: ' 인증 API 테스트 ', assigneeId: memberId, dueDate: '2026-07-30', status: 'not_started', description: '',
    }),
  })
  assert.equal(createResponse.status, 201)
  assert.equal((await createResponse.json()).task.title, '인증 API 테스트')

  const updateResponse = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress' }),
  })
  assert.equal(updateResponse.status, 200)
  assert.equal((await updateResponse.json()).task.status, 'in_progress')

  const deleteResponse = await fetch(`${baseUrl}/api/tasks/${taskId}`, { method: 'DELETE', headers: auth })
  assert.equal(deleteResponse.status, 200)
  assert.deepEqual(await deleteResponse.json(), { taskId })
})
