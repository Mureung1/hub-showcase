import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSupabaseTaskRepository,
  mapTaskInput,
  mapTaskRow,
  TaskStoreError,
} from '../src/tasks/taskRepository.js'

const databaseRow = {
  id: '3f47032e-c2fd-4888-9caa-91022b1428c8',
  project_id: 'project-teamflow',
  title: 'DB 할 일',
  assignee_id: 'member-owner',
  due_date: '2026-07-23',
  status: 'not_started',
  description: null,
  created_at: '2026-07-20T03:30:00.000Z',
}

test('task repository maps database rows to the shared contract', () => {
  assert.deepEqual(mapTaskRow(databaseRow), {
    id: databaseRow.id,
    projectId: 'project-teamflow',
    title: 'DB 할 일',
    assigneeId: 'member-owner',
    dueDate: '2026-07-23',
    status: 'not_started',
    description: '',
  })

  assert.deepEqual(mapTaskInput({
    projectId: 'project-teamflow',
    title: 'DB 할 일',
    assigneeId: 'member-owner',
    dueDate: '2026-07-23',
    status: 'not_started',
    description: '',
  }), {
    project_id: 'project-teamflow',
    title: 'DB 할 일',
    assignee_id: 'member-owner',
    due_date: '2026-07-23',
    status: 'not_started',
    description: null,
  })
})

test('listTasks orders rows by creation time and maps them', async () => {
  let selectedColumns
  let order
  const supabase = {
    from(table) {
      assert.equal(table, 'tasks')
      return {
        select(columns) {
          selectedColumns = columns
          return this
        },
        async order(column, options) {
          order = { column, options }
          return { data: [databaseRow], error: null }
        },
      }
    },
  }

  const repository = createSupabaseTaskRepository(supabase)
  const tasks = await repository.listTasks()

  assert.match(selectedColumns, /project_id/)
  assert.deepEqual(order, { column: 'created_at', options: { ascending: false } })
  assert.equal(tasks[0].projectId, 'project-teamflow')
})

test('createTask inserts the mapped row and returns a new task', async () => {
  let insertedRow
  const supabase = {
    from(table) {
      assert.equal(table, 'tasks')
      return {
        insert(row) {
          insertedRow = row
          return this
        },
        select() {
          return this
        },
        async single() {
          return { data: databaseRow, error: null }
        },
      }
    },
  }

  const repository = createSupabaseTaskRepository(supabase)
  const task = await repository.createTask({
    projectId: 'project-teamflow',
    title: 'DB 할 일',
    assigneeId: 'member-owner',
    dueDate: '2026-07-23',
    status: 'not_started',
    description: '',
  })

  assert.equal(insertedRow.project_id, 'project-teamflow')
  assert.equal(task.id, databaseRow.id)
  assert.equal(task.isNew, true)
})

test('repository wraps Supabase errors without exposing details', async () => {
  const supabase = {
    from() {
      return {
        select() {
          return this
        },
        async order() {
          return { data: null, error: { message: 'secret database detail' } }
        },
      }
    },
  }

  const repository = createSupabaseTaskRepository(supabase)

  await assert.rejects(repository.listTasks(), TaskStoreError)
})
