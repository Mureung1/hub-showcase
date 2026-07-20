import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { createApp } from '../src/app.js'

const existingTask = {
  id: 'task-existing',
  projectId: 'project-teamflow',
  title: '기존 할 일',
  assigneeId: 'member-owner',
  dueDate: '2026-07-21',
  status: 'not_started',
  description: '',
}

const createdTask = {
  id: 'task-created',
  projectId: 'project-teamflow',
  title: 'API 연결 확인',
  assigneeId: 'member-owner',
  dueDate: '2026-07-22',
  status: 'in_progress',
  description: 'Express 생성 테스트',
  isNew: true,
}

const taskRepository = {
  listTasks: async () => [existingTask],
  createTask: async (input) => ({ ...createdTask, ...input }),
}

let server
let baseUrl

before(async () => {
  server = createApp({ taskRepository }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

test('GET /api/tasks returns stored tasks', async () => {
  const response = await fetch(`${baseUrl}/api/tasks`)

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { tasks: [existingTask] })
})

test('POST /api/tasks validates and creates a task', async () => {
  const input = {
    projectId: 'project-teamflow',
    title: '  API 연결 확인  ',
    assigneeId: 'member-owner',
    dueDate: '2026-07-22',
    status: 'in_progress',
    description: 'Express 생성 테스트',
  }

  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    task: {
      ...createdTask,
      title: 'API 연결 확인',
    },
  })
})

test('POST /api/tasks rejects invalid task fields', async () => {
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectId: '',
      title: ' ',
      assigneeId: '',
      dueDate: '2026-02-30',
      status: 'deleted',
      description: 42,
    }),
  })

  assert.equal(response.status, 400)
  const body = await response.json()
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.deepEqual(Object.keys(body.error.fields).sort(), [
    'assigneeId',
    'description',
    'dueDate',
    'projectId',
    'status',
    'title',
  ])
})

test('task endpoints hide repository failures', async () => {
  const failingServer = createApp({
    taskRepository: {
      listTasks: async () => {
        throw new Error('private database error')
      },
      createTask: async () => {
        throw new Error('private database error')
      },
    },
  }).listen(0)

  await new Promise((resolve) => failingServer.once('listening', resolve))
  const address = failingServer.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/api/tasks`)
  await new Promise((resolve, reject) => {
    failingServer.close((error) => (error ? reject(error) : resolve()))
  })

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    error: {
      code: 'TASK_STORE_UNAVAILABLE',
      message: '할 일 저장소에 연결할 수 없습니다.',
    },
  })
})
