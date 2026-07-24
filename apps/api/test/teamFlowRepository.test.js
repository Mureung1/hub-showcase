import assert from 'node:assert/strict'
import test from 'node:test'

import { RESOURCE_UPLOAD } from '@teamflow/shared'

import {
  TeamFlowConflictError,
  TeamFlowNotFoundError,
  TeamFlowValidationError,
  createSupabaseTeamFlowRepository,
} from '../src/teamflow/teamFlowRepository.js'

const userId = '11111111-1111-4111-8111-111111111111'
const projectId = '22222222-2222-4222-8222-222222222222'
const memberId = '33333333-3333-4333-8333-333333333333'
const resourceId = '77777777-7777-4777-8777-777777777777'
const taskId = '44444444-4444-4444-8444-444444444444'
const aiMemberId = '99999999-9999-4999-8999-999999999999'
const aiRunId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const contextConfig = {
  project: true,
  notes: true,
  tasks: true,
  team: false,
  resources: true,
}

function resourceRow({
  id = resourceId,
  uploadStatus = 'pending',
} = {}) {
  return {
    id,
    project_id: projectId,
    parent_id: null,
    type: 'document',
    name: '분기 보고서',
    description: '',
    url: null,
    owner_id: memberId,
    storage_path: `${projectId}/${id}`,
    original_name: 'report.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    upload_status: uploadStatus,
    created_at: '2026-07-23T00:00:00.000Z',
    updated_at: '2026-07-23T00:00:00.000Z',
  }
}

function orderedRows(rows) {
  return {
    select() {
      return this
    },
    eq() {
      return this
    },
    order: async () => ({ data: rows, error: null }),
  }
}

function filteredQuery(rows = []) {
  const filters = []
  const query = {
    select() {
      return query
    },
    eq(field, value) {
      filters.push([field, value])
      return query
    },
    order: async () => ({
      data: rows.filter((row) => filters.every(([field, value]) => row[field] === value)),
      error: null,
    }),
    maybeSingle: async () => ({
      data: rows.find((row) => filters.every(([field, value]) => row[field] === value)) ?? null,
      error: null,
    }),
  }
  return query
}

function aiContextRows({ assigneeId = aiMemberId, status = 'not_started' } = {}) {
  return {
    ai_agents: [{
      member_id: aiMemberId,
      project_id: projectId,
      instructions: '자료를 구조화해 주세요.',
      context_config: contextConfig,
      enabled: true,
      created_at: '2026-07-24T00:00:00.000Z',
      updated_at: '2026-07-24T00:00:00.000Z',
    }],
    projects: [{
      id: projectId,
      owner_id: userId,
      name: 'AI 프로젝트',
      description: '테스트 프로젝트',
      status: 'in_progress',
      icon_key: 'layers',
      start_date: null,
      end_date: null,
    }],
    tasks: [{
      id: taskId,
      project_id: projectId,
      title: '시장 자료 조사',
      assignee_id: assigneeId,
      due_date: '2026-07-31',
      status,
      description: '경쟁 서비스 근거를 정리한다.',
    }],
    notes: [],
    members: [{
      id: aiMemberId,
      project_id: projectId,
      auth_user_id: null,
      email: null,
      kind: 'ai',
      name: '자료조사 AI',
      initial: 'AI',
      role: '자료 조사',
      description: '',
      avatar_url: null,
      color: '#6950b8',
      is_ai: true,
    }],
    resources: [],
  }
}

test('bootstrap includes project-scoped AI agents and run history', async () => {
  const rows = {
    projects: [{
      id: projectId,
      owner_id: userId,
      name: 'AI 프로젝트',
      description: '',
      status: 'in_progress',
      icon_key: 'layers',
      start_date: null,
      end_date: null,
    }],
    members: [{
      id: memberId,
      project_id: projectId,
      auth_user_id: userId,
      email: 'user@example.com',
      kind: 'user',
      name: '사용자',
      initial: '사',
      role: '기획',
      description: '',
      avatar_url: null,
      color: '#3a6898',
      is_ai: false,
    }],
    tasks: [],
    notes: [],
    resources: [],
    ai_agents: [{
      member_id: aiMemberId,
      project_id: projectId,
      instructions: '자료를 구조화해 주세요.',
      context_config: contextConfig,
      enabled: true,
      created_at: '2026-07-24T00:00:00.000Z',
      updated_at: '2026-07-24T00:00:00.000Z',
    }],
    ai_runs: [{
      id: aiRunId,
      project_id: projectId,
      ai_member_id: aiMemberId,
      task_id: taskId,
      status: 'pending_review',
      context_snapshot: { version: 1 },
      result_markdown: '# 모의 실행 결과',
      error_message: null,
      applied_note_id: null,
      created_by: userId,
      created_at: '2026-07-24T00:00:00.000Z',
      updated_at: '2026-07-24T00:00:00.000Z',
    }],
  }
  const supabase = {
    from: (table) => orderedRows(rows[table]),
    rpc: async (name) => {
      assert.equal(name, 'list_project_invitations')
      return { data: [], error: null }
    },
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  const result = await repository.load()

  assert.ok(Array.isArray(result.aiAgents))
  assert.ok(Array.isArray(result.aiRuns))
  assert.equal(result.aiAgents[0].memberId, aiMemberId)
  assert.equal(result.aiRuns[0].id, aiRunId)
  assert.equal(result.capabilities.ai, true)
  assert.equal(Object.hasOwn(result, 'aiSettings'), false)
  assert.equal(Object.hasOwn(result, 'aiHistory'), false)
  assert.equal(Object.hasOwn(result, 'aiMemberId'), false)
})

test('AI agent profile creation and partial updates use the multi-agent database RPC contracts', async () => {
  const calls = []
  const member = {
    id: aiMemberId,
    project_id: projectId,
    auth_user_id: null,
    email: null,
    kind: 'ai',
    name: '자료조사 AI',
    initial: 'AI',
    role: '자료 조사',
    description: '',
    avatar_url: null,
    color: '#6950b8',
    is_ai: true,
  }
  const agent = {
    member_id: aiMemberId,
    project_id: projectId,
    instructions: '자료를 구조화해 주세요.',
    context_config: contextConfig,
    enabled: true,
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
  }
  const run = {
    id: aiRunId,
    project_id: projectId,
    ai_member_id: aiMemberId,
    task_id: taskId,
    status: 'pending_review',
    context_snapshot: { version: 1 },
    result_markdown: '# 모의 실행 결과',
    error_message: null,
    applied_note_id: null,
    created_by: userId,
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
  }
  const note = {
    id: resourceId,
    project_id: projectId,
    title: 'AI 결과 · 조사',
    content: run.result_markdown,
    author_id: memberId,
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
  }
  const createInput = {
    name: '리서치 파트너',
    role: '시장 조사',
    description: '경쟁 서비스와 시장 근거를 정리합니다.',
    color: '#6950b8',
    instructions: '신뢰할 수 있는 자료를 구조화해 주세요.',
    contextConfig,
  }
  const supabase = {
    from: (table) => filteredQuery({ members: [member], ai_agents: [agent] }[table]),
    rpc: async (name, args) => {
      calls.push({ name, args })
      if (name === 'create_project_ai_agent') {
        return {
          data: {
            member: {
              ...member,
              name: args.p_name,
              initial: '리',
              role: args.p_role,
              description: args.p_description,
              color: args.p_color,
            },
            aiAgent: {
              ...agent,
              instructions: args.p_instructions,
              context_config: args.p_context_config,
            },
          },
          error: null,
        }
      }
      if (name === 'update_ai_agent') {
        return {
          data: {
            member: {
              ...member,
              name: args.p_name,
              initial: '전',
              role: args.p_role,
              description: args.p_description,
              color: args.p_color,
            },
            aiAgent: {
              ...agent,
              instructions: args.p_instructions,
              context_config: args.p_context_config,
              enabled: args.p_enabled,
            },
          },
          error: null,
        }
      }
      if (name === 'apply_ai_run') {
        return {
          data: {
            aiRun: { ...run, status: 'applied', applied_note_id: note.id },
            note,
          },
          error: null,
        }
      }
      if (name === 'reject_ai_run') {
        return { data: { ...run, status: 'rejected' }, error: null }
      }
      assert.fail(`unexpected RPC ${name}`)
    },
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  assert.equal(typeof repository.createAiAgent, 'function')
  assert.equal(typeof repository.updateAiAgent, 'function')
  assert.equal(typeof repository.applyAiRun, 'function')
  assert.equal(typeof repository.rejectAiRun, 'function')

  const created = await repository.createAiAgent(projectId, createInput)
  const updated = await repository.updateAiAgent(aiMemberId, {
    name: '전략 리서치 Agent',
    enabled: false,
  })
  const applied = await repository.applyAiRun(aiRunId)
  const rejected = await repository.rejectAiRun(aiRunId)

  assert.equal(created.member.kind, 'ai')
  assert.equal(created.member.name, createInput.name)
  assert.equal(created.member.initial, '리')
  assert.equal(created.aiAgent.memberId, aiMemberId)
  assert.equal(updated.member.name, '전략 리서치 Agent')
  assert.deepEqual(updated.aiAgent.contextConfig, contextConfig)
  assert.equal(updated.aiAgent.enabled, false)
  assert.equal(applied.aiRun.status, 'applied')
  assert.equal(applied.note.id, note.id)
  assert.equal(rejected.status, 'rejected')
  assert.deepEqual(calls, [
    {
      name: 'create_project_ai_agent',
      args: {
        p_project_id: projectId,
        p_name: createInput.name,
        p_role: createInput.role,
        p_description: createInput.description,
        p_color: createInput.color,
        p_instructions: createInput.instructions,
        p_context_config: createInput.contextConfig,
      },
    },
    {
      name: 'update_ai_agent',
      args: {
        p_member_id: aiMemberId,
        p_name: '전략 리서치 Agent',
        p_role: member.role,
        p_description: member.description,
        p_color: member.color,
        p_instructions: agent.instructions,
        p_context_config: contextConfig,
        p_enabled: false,
      },
    },
    {
      name: 'apply_ai_run',
      args: { p_run_id: aiRunId },
    },
    {
      name: 'reject_ai_run',
      args: { p_run_id: aiRunId },
    },
  ])
})

test('AI RPC not-found errors remain hidden behind the repository 404 contract', async () => {
  const notFoundByRpc = {
    update_ai_agent: 'AI_AGENT_NOT_FOUND',
    apply_ai_run: 'AI_RUN_NOT_FOUND',
    reject_ai_run: 'AI_RUN_NOT_FOUND',
  }
  const rows = aiContextRows()
  const supabase = {
    from: (table) => filteredQuery(rows[table]),
    rpc: async (name) => ({
      data: null,
      error: { code: 'P0001', message: notFoundByRpc[name] },
    }),
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  await assert.rejects(
    repository.updateAiAgent(aiMemberId, { instructions: '' }),
    TeamFlowNotFoundError,
  )
  await assert.rejects(repository.applyAiRun(aiRunId), TeamFlowNotFoundError)
  await assert.rejects(repository.rejectAiRun(aiRunId), TeamFlowNotFoundError)
})

test('mock AI run gathers project context on the server and stores pending review through RPC', async () => {
  const rows = aiContextRows()
  const calls = []
  const snapshot = {
    version: 1,
    instructions: rows.ai_agents[0].instructions,
    task: { id: taskId, title: rows.tasks[0].title },
    contextConfig,
    context: { project: { id: projectId, name: rows.projects[0].name } },
    truncation: {},
  }
  const run = {
    id: aiRunId,
    project_id: projectId,
    ai_member_id: aiMemberId,
    task_id: taskId,
    status: 'pending_review',
    context_snapshot: snapshot,
    result_markdown: '# 모의 실행 결과',
    error_message: null,
    applied_note_id: null,
    created_by: userId,
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
  }
  const supabase = {
    from: (table) => filteredQuery(rows[table]),
    rpc: async (name, args) => {
      calls.push({ name, args })
      return { data: run, error: null }
    },
  }
  const generatedInputs = []
  const repository = createSupabaseTeamFlowRepository(
    supabase,
    { id: userId },
    {
      buildMockAiContext: () => snapshot,
      generateMockAiResult: (input) => {
        generatedInputs.push(input)
        return { contextSnapshot: snapshot, resultMarkdown: run.result_markdown }
      },
    },
  )

  assert.equal(typeof repository.createAiRun, 'function')
  const result = await repository.createAiRun(aiMemberId, taskId)

  assert.equal(result.status, 'pending_review')
  assert.equal(generatedInputs.length, 1)
  assert.equal(generatedInputs[0].task.id, taskId)
  assert.equal(generatedInputs[0].project.id, projectId)
  assert.deepEqual(calls, [{
    name: 'create_mock_ai_run',
    args: {
      p_member_id: aiMemberId,
      p_task_id: taskId,
      p_context_snapshot: snapshot,
      p_result_markdown: run.result_markdown,
    },
  }])
})

test('mock AI generator failures are persisted as failed runs', async () => {
  const rows = aiContextRows()
  const snapshot = { version: 1, task: { id: taskId }, context: {}, truncation: {} }
  const calls = []
  const failedRun = {
    id: aiRunId,
    project_id: projectId,
    ai_member_id: aiMemberId,
    task_id: taskId,
    status: 'failed',
    context_snapshot: snapshot,
    result_markdown: '',
    error_message: 'Mock 결과 생성에 실패했습니다.',
    applied_note_id: null,
    created_by: userId,
    created_at: '2026-07-24T00:00:00.000Z',
    updated_at: '2026-07-24T00:00:00.000Z',
  }
  const supabase = {
    from: (table) => filteredQuery(rows[table]),
    rpc: async (name, args) => {
      calls.push({ name, args })
      return { data: failedRun, error: null }
    },
  }
  const repository = createSupabaseTeamFlowRepository(
    supabase,
    { id: userId },
    {
      buildMockAiContext: () => snapshot,
      generateMockAiResult: () => {
        throw new Error('generator exploded')
      },
    },
  )

  const result = await repository.createAiRun(aiMemberId, taskId)

  assert.equal(result.status, 'failed')
  assert.deepEqual(calls, [{
    name: 'create_failed_mock_ai_run',
    args: {
      p_member_id: aiMemberId,
      p_task_id: taskId,
      p_context_snapshot: snapshot,
      p_error_message: 'Mock 결과 생성에 실패했습니다.',
    },
  }])
})

test('mock AI run rejects completed tasks and tasks assigned to another member before generation', async () => {
  for (const rows of [
    aiContextRows({ status: 'completed' }),
    aiContextRows({ assigneeId: memberId }),
  ]) {
    const supabase = {
      from: (table) => filteredQuery(rows[table]),
      rpc: async () => assert.fail('invalid runs must not call a mutation RPC'),
    }
    const repository = createSupabaseTeamFlowRepository(supabase, { id: userId }, {
      buildMockAiContext: () => assert.fail('invalid runs must not build context'),
      generateMockAiResult: () => assert.fail('invalid runs must not generate output'),
    })

    await assert.rejects(
      repository.createAiRun(aiMemberId, taskId),
      TeamFlowConflictError,
    )
  }
})

test('disabled project AI cannot receive a new task or a task reassignment before mutation', async () => {
  const rows = aiContextRows()
  rows.ai_agents[0] = { ...rows.ai_agents[0], enabled: false }
  const taskInput = {
    projectId,
    title: '비활성 AI 배정 차단',
    assigneeId: aiMemberId,
    dueDate: '2026-07-31',
    status: 'not_started',
    description: '',
  }
  const supabase = {
    from(table) {
      if (table === 'ai_agents') return filteredQuery(rows.ai_agents)
      if (table === 'tasks') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: rows.tasks[0], error: null }),
                }
              },
            }
          },
          insert() {
            assert.fail('disabled AI must be rejected before task insert')
          },
          update() {
            assert.fail('disabled AI must be rejected before task update')
          },
        }
      }
      assert.fail(`unexpected table ${table}`)
    },
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  await assert.rejects(
    repository.createTask(taskInput),
    TeamFlowConflictError,
  )
  await assert.rejects(
    repository.updateTask(taskId, { assigneeId: aiMemberId }),
    TeamFlowConflictError,
  )
})

test('resource upload intent uses the database RPC before creating a signed upload URL', async () => {
  const calls = []
  const supabase = {
    rpc: async (name, args) => {
      calls.push({ kind: 'rpc', name, args })
      assert.equal(name, 'create_resource_upload_intent')
      return {
        data: resourceRow({ id: args.p_resource_id }),
        error: null,
      }
    },
    storage: {
      from: (bucket) => {
        assert.equal(bucket, RESOURCE_UPLOAD.BUCKET)
        return {
          createSignedUploadUrl: async (path) => {
            calls.push({ kind: 'signed-upload', path })
            return { data: { path, token: 'signed-upload-token' }, error: null }
          },
        }
      },
    },
    from: () => assert.fail('upload intent must not insert resources directly'),
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  const result = await repository.createResourceUpload(projectId, {
    parentId: null,
    type: 'document',
    name: '분기 보고서',
    description: '',
    originalName: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  })

  const rpcCall = calls[0]
  assert.equal(rpcCall.kind, 'rpc')
  assert.match(rpcCall.args.p_resource_id, /^[0-9a-f-]{36}$/)
  assert.deepEqual(rpcCall.args, {
    p_resource_id: rpcCall.args.p_resource_id,
    p_project_id: projectId,
    p_parent_id: null,
    p_type: 'document',
    p_name: '분기 보고서',
    p_description: '',
    p_original_name: 'report.pdf',
    p_mime_type: 'application/pdf',
    p_size_bytes: 1024,
  })
  assert.deepEqual(calls[1], {
    kind: 'signed-upload',
    path: `${projectId}/${rpcCall.args.p_resource_id}`,
  })
  assert.equal(result.resource.id, rpcCall.args.p_resource_id)
  assert.deepEqual(result.upload, {
    bucket: RESOURCE_UPLOAD.BUCKET,
    path: `${projectId}/${rpcCall.args.p_resource_id}`,
    token: 'signed-upload-token',
  })
})

test('resource upload completion is delegated entirely to the database RPC', async () => {
  const calls = []
  const supabase = {
    rpc: async (name, args) => {
      calls.push({ name, args })
      return {
        data: resourceRow({ id: args.p_resource_id, uploadStatus: 'ready' }),
        error: null,
      }
    },
    storage: {
      from: () => assert.fail('upload completion must not inspect Storage directly'),
    },
    from: () => assert.fail('upload completion must not update resources directly'),
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  const completed = await repository.completeResourceUpload(resourceId)

  assert.deepEqual(calls, [{
    name: 'complete_resource_upload',
    args: { p_resource_id: resourceId },
  }])
  assert.equal(completed.id, resourceId)
  assert.equal(completed.uploadStatus, 'ready')
})

test('resource upload RPC validation errors remain client validation errors', async () => {
  const supabase = {
    rpc: async () => ({
      data: null,
      error: { message: 'INVALID_RESOURCE_UPLOAD' },
    }),
    storage: {
      from: () => assert.fail('invalid upload intents must not create signed URLs'),
    },
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  await assert.rejects(
    repository.createResourceUpload(projectId, {
      parentId: null,
      type: 'document',
      name: '분기 보고서',
      description: '',
      originalName: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    }),
    (error) => (
      error instanceof TeamFlowValidationError
      && error.fields.file === '업로드할 파일 정보를 확인해 주세요.'
    ),
  )
})
