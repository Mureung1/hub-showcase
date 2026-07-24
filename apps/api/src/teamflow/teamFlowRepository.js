import { randomUUID } from 'node:crypto'

import { PROJECT_ICON, RESOURCE_UPLOAD, TASK_STATUS } from '@teamflow/shared'

import {
  buildMockAiContext as defaultBuildMockAiContext,
  generateMockAiResult as defaultGenerateMockAiResult,
} from './mockAiGenerator.js'

const MEMBER_COLUMNS = [
  'id',
  'project_id',
  'auth_user_id',
  'email',
  'kind',
  'name',
  'initial',
  'role',
  'description',
  'avatar_url',
  'color',
  'is_ai',
].join(',')

const PROJECT_COLUMNS = [
  'id',
  'owner_id',
  'name',
  'description',
  'status',
  'icon_key',
  'start_date',
  'end_date',
].join(',')

const TASK_COLUMNS = [
  'id',
  'project_id',
  'title',
  'assignee_id',
  'due_date',
  'status',
  'description',
].join(',')

const NOTE_COLUMNS = [
  'id',
  'project_id',
  'title',
  'content',
  'author_id',
  'created_at',
  'updated_at',
].join(',')

const RESOURCE_COLUMNS = [
  'id',
  'project_id',
  'parent_id',
  'type',
  'name',
  'description',
  'url',
  'owner_id',
  'storage_path',
  'original_name',
  'mime_type',
  'size_bytes',
  'upload_status',
  'created_at',
  'updated_at',
].join(',')

const AI_AGENT_COLUMNS = [
  'member_id',
  'project_id',
  'instructions',
  'context_config',
  'enabled',
  'created_at',
  'updated_at',
].join(',')

const AI_RUN_COLUMNS = [
  'id',
  'project_id',
  'ai_member_id',
  'task_id',
  'status',
  'context_snapshot',
  'result_markdown',
  'error_message',
  'applied_note_id',
  'created_by',
  'created_at',
  'updated_at',
].join(',')

export class TeamFlowStoreError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = 'TeamFlowStoreError'
  }
}

export class TeamFlowNotFoundError extends Error {
  constructor(message = '요청한 데이터를 찾을 수 없습니다.') {
    super(message)
    this.name = 'TeamFlowNotFoundError'
  }
}

export class TeamFlowConflictError extends Error {
  constructor(message = '현재 상태에서는 요청을 처리할 수 없습니다.') {
    super(message)
    this.name = 'TeamFlowConflictError'
  }
}

export class TeamFlowValidationError extends Error {
  constructor(message = '입력값을 확인해 주세요.', fields = {}) {
    super(message)
    this.name = 'TeamFlowValidationError'
    this.fields = fields
  }
}

function storeError(operation, error) {
  throw new TeamFlowStoreError(`${operation}에 실패했습니다.`, { cause: error })
}

function databaseErrorMessage(error) {
  return typeof error?.message === 'string' ? error.message : ''
}

function throwDatabaseError(operation, error) {
  const message = databaseErrorMessage(error)
  if (
    message.includes('TEAMFLOW_NOT_FOUND')
    || /(?:PROJECT|MEMBER|INVITATION|TASK|AI_AGENT|AI_RUN)_NOT_FOUND/.test(message)
  ) {
    throw new TeamFlowNotFoundError()
  }
  if (/(?:INVALID_RESOURCE_URL|RESOURCE_URL_REQUIRED|FOLDER_URL_NOT_ALLOWED|FOLDER_MUST_BE_ROOT|INVALID_RESOURCE_PARENT|INVALID_RESOURCE_TYPE_CHANGE)/.test(message)) {
    const field = /URL/.test(message) ? 'url' : (/TYPE/.test(message) ? 'type' : 'parentId')
    throw new TeamFlowValidationError(undefined, { [field]: '자료 정보를 확인해 주세요.' })
  }
  if (message.includes('INVALID_RESOURCE_UPLOAD')) {
    throw new TeamFlowValidationError(undefined, { file: '업로드할 파일 정보를 확인해 주세요.' })
  }
  if (error?.code === '23514') {
    throw new TeamFlowValidationError(undefined, { body: '입력값이 데이터 제약조건을 충족하지 않습니다.' })
  }
  if (
    error?.code === '23503'
    || error?.code === '23505'
    || error?.code === '23P01'
    || message.includes('TEAMFLOW_CONFLICT')
  ) {
    const detail = message.split('TEAMFLOW_CONFLICT:')[1]?.trim()
    throw new TeamFlowConflictError(detail || undefined)
  }
  storeError(operation, error)
}

function mapMember(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    authUserId: row.auth_user_id ?? null,
    email: row.email ?? null,
    kind: row.kind,
    name: row.name,
    initial: row.initial,
    role: row.role,
    description: row.description ?? '',
    avatarUrl: row.avatar_url ?? '',
    color: row.color,
    isAi: row.is_ai,
  }
}

function mapProject(row, memberIds) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    status: row.status,
    iconKey: row.icon_key ?? PROJECT_ICON.LAYERS,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    ...(memberIds ? { memberIds } : {}),
  }
}

function mapTask(row, isNew = false) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    status: row.status,
    description: row.description ?? '',
    ...(isNew ? { isNew: true } : {}),
  }
}

function mapNote(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    authorId: row.author_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapResource(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id ?? null,
    type: row.type,
    name: row.name,
    description: row.description ?? '',
    url: row.url ?? null,
    ownerId: row.owner_id ?? null,
    storagePath: row.storage_path ?? null,
    originalName: row.original_name ?? null,
    mimeType: row.mime_type ?? null,
    sizeBytes: row.size_bytes ?? null,
    uploadStatus: row.upload_status ?? 'ready',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInvitation(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name ?? '',
    inviteeEmail: row.invitee_email,
    invitedBy: row.invited_by,
    inviterName: row.inviter_name ?? row.invited_by_name ?? '',
    status: row.status,
    direction: row.direction === 'incoming' ? 'received' : (row.direction === 'outgoing' ? 'sent' : row.direction),
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? null,
  }
}

function mapAiAgent(row) {
  return {
    memberId: row.member_id,
    projectId: row.project_id,
    instructions: row.instructions ?? '',
    contextConfig: row.context_config,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAiRun(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    aiMemberId: row.ai_member_id,
    taskId: row.task_id ?? null,
    status: row.status,
    contextSnapshot: row.context_snapshot,
    resultMarkdown: row.result_markdown ?? '',
    errorMessage: row.error_message ?? null,
    appliedNoteId: row.applied_note_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function unwrapRpcRow(data) {
  return Array.isArray(data) ? data[0] : data
}

function rpcRows(data) {
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

function rpcObject(data) {
  return unwrapRpcRow(data)
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

export function createSupabaseDemoRepository(supabase) {
  return {
    async loadDemo() {
      const { data, error } = await supabase
        .from('demo_workspaces')
        .select('payload')
        .eq('slug', 'teamflow')
        .eq('is_active', true)
        .single()

      if (error || !data?.payload) storeError('데모 조회', error)

      return {
        ...data.payload,
        accessMode: 'guest',
        capabilities: {
          projects: false,
          members: false,
          tasks: false,
          notes: false,
          resources: false,
          ai: false,
        },
      }
    },
  }
}

export function createSupabaseTeamFlowRepository(
  supabase,
  user,
  {
    buildMockAiContext = defaultBuildMockAiContext,
    generateMockAiResult = defaultGenerateMockAiResult,
  } = {},
) {
  async function currentProjectMemberId(projectId) {
    const { data, error } = await supabase
      .from('project_access')
      .select('member_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throwDatabaseError('현재 프로젝트 담당자 조회', error)
    if (!data?.member_id) throw new TeamFlowNotFoundError()
    return data.member_id
  }

  async function listInvitations() {
    const { data, error } = await supabase.rpc('list_project_invitations')
    if (error) throwDatabaseError('프로젝트 초대 조회', error)
    return rpcRows(data).map(mapInvitation)
  }

  async function respondToInvitation(operation, rpcName, invitationId) {
    const { data, error } = await supabase.rpc(rpcName, { p_invitation_id: invitationId })
    if (error) throwDatabaseError(operation, error)
    const row = unwrapRpcRow(data)
    if (!row) throw new TeamFlowNotFoundError()
    if (typeof row === 'string') return { invitationId: row }
    if (row.projectId && row.memberId) return row
    if (row.project_id && row.member_id && !row.invitee_email) {
      return { projectId: row.project_id, memberId: row.member_id }
    }
    return mapInvitation(row)
  }

  async function removeStoredFiles(paths, operation) {
    const uniquePaths = [...new Set(paths.filter(Boolean))]
    if (uniquePaths.length === 0) return

    const { error } = await supabase.storage
      .from(RESOURCE_UPLOAD.BUCKET)
      .remove(uniquePaths)

    if (error) storeError(operation, error)
  }

  return {
    async load() {
      const [
        projectsResult,
        membersResult,
        tasksResult,
        notesResult,
        resourcesResult,
        aiAgentsResult,
        aiRunsResult,
        invitations,
      ] = await Promise.all([
        supabase.from('projects').select(PROJECT_COLUMNS).order('created_at', { ascending: false }),
        supabase.from('members').select(MEMBER_COLUMNS).order('created_at', { ascending: true }),
        supabase.from('tasks').select(TASK_COLUMNS).order('created_at', { ascending: false }),
        supabase.from('notes').select(NOTE_COLUMNS).order('updated_at', { ascending: false }),
        supabase.from('resources').select(RESOURCE_COLUMNS).eq('upload_status', 'ready').order('created_at', { ascending: true }),
        supabase.from('ai_agents').select(AI_AGENT_COLUMNS).order('created_at', { ascending: true }),
        supabase.from('ai_runs').select(AI_RUN_COLUMNS).order('created_at', { ascending: false }),
        listInvitations(),
      ])

      const failed = [
        projectsResult,
        membersResult,
        tasksResult,
        notesResult,
        resourcesResult,
        aiAgentsResult,
        aiRunsResult,
      ]
        .find((result) => result.error)
      if (failed) throwDatabaseError('워크스페이스 조회', failed.error)

      const members = membersResult.data.map(mapMember)
      const memberIdsByProject = new Map()
      const currentMemberIdsByProject = {}
      for (const member of members) {
        const memberIds = memberIdsByProject.get(member.projectId) ?? []
        memberIds.push(member.id)
        memberIdsByProject.set(member.projectId, memberIds)
        if (member.authUserId === user.id) currentMemberIdsByProject[member.projectId] = member.id
      }

      const projects = projectsResult.data.map((project) => {
        const memberIds = memberIdsByProject.get(project.id) ?? []
        const creator = members.find((member) => (
          member.projectId === project.id && member.authUserId === project.owner_id
        ))
        return {
          ...mapProject(project, memberIds),
          creatorId: creator?.id ?? memberIds[0] ?? '',
        }
      })

      return {
        projects,
        members,
        tasks: tasksResult.data.map((task) => mapTask(task)),
        notes: notesResult.data.map(mapNote),
        resources: resourcesResult.data.map(mapResource),
        aiAgents: aiAgentsResult.data.map(mapAiAgent),
        aiRuns: aiRunsResult.data.map(mapAiRun),
        invitations,
        currentMemberIdsByProject,
        currentUserId: Object.values(currentMemberIdsByProject)[0] ?? '',
        accessMode: 'authenticated',
        capabilities: {
          projects: true,
          members: true,
          tasks: true,
          notes: true,
          resources: true,
          ai: true,
        },
      }
    },

    listInvitations,

    async createAiAgent(projectId) {
      const { data, error } = await supabase.rpc('create_project_ai_agent', {
        p_project_id: projectId,
      })
      if (error) throwDatabaseError('AI 팀원 생성', error)
      const result = rpcObject(data)
      const member = result?.member
      const aiAgent = result?.aiAgent ?? result?.ai_agent
      if (!member || !aiAgent) storeError('AI 팀원 생성')
      return {
        member: mapMember(member),
        aiAgent: mapAiAgent(aiAgent),
      }
    },

    async updateAiAgent(memberId, input) {
      const { data, error } = await supabase.rpc('update_ai_agent_settings', {
        p_member_id: memberId,
        p_instructions: input.instructions,
        p_context_config: input.contextConfig,
      })
      if (error) throwDatabaseError('AI 팀원 설정 저장', error)
      const row = rpcObject(data)
      if (!row) throw new TeamFlowNotFoundError()
      return mapAiAgent(row)
    },

    async createAiRun(memberId, taskId) {
      const { data: agent, error: agentError } = await supabase
        .from('ai_agents')
        .select(AI_AGENT_COLUMNS)
        .eq('member_id', memberId)
        .maybeSingle()

      if (agentError) throwDatabaseError('AI 팀원 조회', agentError)
      if (!agent) throw new TeamFlowNotFoundError()
      if (!agent.enabled) throw new TeamFlowConflictError('비활성화된 AI 팀원은 실행할 수 없습니다.')

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(TASK_COLUMNS)
        .eq('id', taskId)
        .eq('project_id', agent.project_id)
        .maybeSingle()

      if (taskError) throwDatabaseError('AI 할 일 조회', taskError)
      if (!task) throw new TeamFlowNotFoundError()
      if (task.assignee_id !== memberId) {
        throw new TeamFlowConflictError('AI 팀원에게 배정된 할 일만 실행할 수 있습니다.')
      }
      if (task.status === TASK_STATUS.COMPLETED) {
        throw new TeamFlowConflictError('완료된 할 일은 다시 실행할 수 없습니다.')
      }

      const [
        projectResult,
        notesResult,
        tasksResult,
        membersResult,
        resourcesResult,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select(PROJECT_COLUMNS)
          .eq('id', agent.project_id)
          .maybeSingle(),
        supabase
          .from('notes')
          .select(NOTE_COLUMNS)
          .eq('project_id', agent.project_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('tasks')
          .select(TASK_COLUMNS)
          .eq('project_id', agent.project_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('members')
          .select(MEMBER_COLUMNS)
          .eq('project_id', agent.project_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('resources')
          .select(RESOURCE_COLUMNS)
          .eq('project_id', agent.project_id)
          .eq('upload_status', 'ready')
          .order('created_at', { ascending: true }),
      ])

      const failed = [
        projectResult,
        notesResult,
        tasksResult,
        membersResult,
        resourcesResult,
      ].find((result) => result.error)
      if (failed) throwDatabaseError('AI 실행 컨텍스트 조회', failed.error)
      if (!projectResult.data) throw new TeamFlowNotFoundError()

      const generatorInput = {
        instructions: agent.instructions ?? '',
        contextConfig: agent.context_config,
        task: mapTask(task),
        project: mapProject(projectResult.data),
        notes: (notesResult.data ?? []).map(mapNote),
        tasks: (tasksResult.data ?? []).map(mapTask),
        members: (membersResult.data ?? []).map(mapMember),
        resources: (resourcesResult.data ?? []).map(mapResource),
      }

      let contextSnapshot
      let generated
      try {
        contextSnapshot = buildMockAiContext(generatorInput)
        generated = generateMockAiResult(generatorInput)
      } catch {
        contextSnapshot ??= {
          version: 1,
          instructions: agent.instructions ?? '',
          task: mapTask(task),
          contextConfig: agent.context_config,
          context: {},
          truncation: { generationFailed: true },
        }
        const message = 'Mock 결과 생성에 실패했습니다.'
        const { data, error: failedRunError } = await supabase.rpc('create_failed_mock_ai_run', {
          p_member_id: memberId,
          p_task_id: taskId,
          p_context_snapshot: contextSnapshot,
          p_error_message: message,
        })
        if (failedRunError) throwDatabaseError('AI 실패 이력 저장', failedRunError)
        const row = rpcObject(data)
        if (!row) storeError('AI 실패 이력 저장')
        return mapAiRun(row)
      }

      const { data, error } = await supabase.rpc('create_mock_ai_run', {
        p_member_id: memberId,
        p_task_id: taskId,
        p_context_snapshot: generated.contextSnapshot,
        p_result_markdown: generated.resultMarkdown,
      })
      if (error) throwDatabaseError('AI 모의 작업 실행', error)
      const row = rpcObject(data)
      if (!row) storeError('AI 모의 작업 실행')
      return mapAiRun(row)
    },

    async applyAiRun(runId) {
      const { data, error } = await supabase.rpc('apply_ai_run', {
        p_run_id: runId,
      })
      if (error) throwDatabaseError('AI 실행 결과 노트 반영', error)
      const result = rpcObject(data)
      const aiRun = result?.aiRun ?? result?.ai_run
      if (!aiRun) throw new TeamFlowNotFoundError()
      return {
        aiRun: mapAiRun(aiRun),
        note: result.note ? mapNote(result.note) : null,
      }
    },

    async rejectAiRun(runId) {
      const { data, error } = await supabase.rpc('reject_ai_run', {
        p_run_id: runId,
      })
      if (error) throwDatabaseError('AI 실행 결과 보류', error)
      const row = rpcObject(data)
      if (!row) throw new TeamFlowNotFoundError()
      return mapAiRun(row)
    },

    async createInvitation(projectId, input) {
      const { data, error } = await supabase.rpc('create_project_invitation', {
        p_project_id: projectId,
        p_invitee_email: input.email,
      })
      if (error) throwDatabaseError('프로젝트 초대 생성', error)
      const row = unwrapRpcRow(data)
      if (!row) storeError('프로젝트 초대 생성')
      try {
        const invitations = await listInvitations()
        return invitations.find((invitation) => invitation.id === row.id) ?? mapInvitation(row)
      } catch {
        return { ...mapInvitation(row), inviterName: user.displayName, direction: 'sent' }
      }
    },

    acceptInvitation(invitationId) {
      return respondToInvitation('프로젝트 초대 수락', 'accept_project_invitation', invitationId)
    },

    rejectInvitation(invitationId) {
      return respondToInvitation('프로젝트 초대 거절', 'reject_project_invitation', invitationId)
    },

    cancelInvitation(invitationId) {
      return respondToInvitation('프로젝트 초대 취소', 'cancel_project_invitation', invitationId)
    },

    async createProject(input) {
      const { data, error } = await supabase.rpc('create_project_with_owner', {
        p_name: input.name,
        p_description: input.description,
        p_status: input.status,
        p_start_date: input.startDate || null,
        p_end_date: input.endDate || null,
      })
      if (error) throwDatabaseError('프로젝트 생성', error)
      const row = unwrapRpcRow(data)
      if (!row) storeError('프로젝트 생성')
      const memberId = await currentProjectMemberId(row.id)

      return {
        ...mapProject(row, [memberId]),
        creatorId: memberId,
      }
    },

    async updateProject(projectId, patch) {
      const databasePatch = { updated_at: new Date().toISOString() }
      if (hasOwn(patch, 'name')) databasePatch.name = patch.name
      if (hasOwn(patch, 'description')) databasePatch.description = patch.description || ''
      if (hasOwn(patch, 'status')) databasePatch.status = patch.status
      if (hasOwn(patch, 'iconKey')) databasePatch.icon_key = patch.iconKey
      if (hasOwn(patch, 'startDate')) databasePatch.start_date = patch.startDate || null
      if (hasOwn(patch, 'endDate')) databasePatch.end_date = patch.endDate || null

      const { data, error } = await supabase
        .from('projects')
        .update(databasePatch)
        .eq('id', projectId)
        .select(PROJECT_COLUMNS)
        .maybeSingle()

      if (error) throwDatabaseError('프로젝트 수정', error)
      if (!data) throw new TeamFlowNotFoundError()
      return mapProject(data)
    },

    async deleteProject(projectId) {
      const { data: files, error: filesError } = await supabase
        .from('resources')
        .select('storage_path')
        .eq('project_id', projectId)
        .not('storage_path', 'is', null)

      if (filesError) throwDatabaseError('프로젝트 자료 조회', filesError)
      await removeStoredFiles((files ?? []).map((file) => file.storage_path), '프로젝트 파일 삭제')

      const { data, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .select('id')
        .maybeSingle()

      if (error) throwDatabaseError('프로젝트 삭제', error)
      if (!data) throw new TeamFlowNotFoundError()
      return data.id
    },

    async updateMember(memberId, patch) {
      const { data, error } = await supabase.rpc('update_project_member', {
        p_member_id: memberId,
        p_role: patch.role,
        p_description: patch.description,
        p_color: patch.color,
      })
      if (error) throwDatabaseError('협업자 정보 수정', error)
      const row = unwrapRpcRow(data)
      if (!row) throw new TeamFlowNotFoundError()
      return mapMember(row)
    },

    async deleteMember(memberId) {
      const { data, error } = await supabase.rpc('remove_project_member', {
        p_member_id: memberId,
      })
      if (error) throwDatabaseError('협업자 제거', error)
      const row = unwrapRpcRow(data)
      if (typeof row === 'string') return { memberId: row }
      if (row?.memberId) return row
      return {
        memberId: row?.id ?? row?.member_id ?? memberId,
        projectId: row?.project_id,
        wasCollaborator: row?.was_collaborator,
      }
    },

    async createTask(input) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: input.projectId,
          title: input.title,
          assignee_id: input.assigneeId,
          due_date: input.dueDate,
          status: input.status,
          description: input.description || '',
        })
        .select(TASK_COLUMNS)
        .single()

      if (error) throwDatabaseError('할 일 생성', error)
      if (!data) storeError('할 일 생성')
      return mapTask(data, true)
    },

    async updateTask(taskId, patch) {
      const databasePatch = { updated_at: new Date().toISOString() }
      if (hasOwn(patch, 'title')) databasePatch.title = patch.title
      if (hasOwn(patch, 'assigneeId')) databasePatch.assignee_id = patch.assigneeId
      if (hasOwn(patch, 'dueDate')) databasePatch.due_date = patch.dueDate
      if (hasOwn(patch, 'status')) databasePatch.status = patch.status
      if (hasOwn(patch, 'description')) databasePatch.description = patch.description || ''

      const { data, error } = await supabase
        .from('tasks')
        .update(databasePatch)
        .eq('id', taskId)
        .select(TASK_COLUMNS)
        .maybeSingle()

      if (error) throwDatabaseError('할 일 수정', error)
      if (!data) throw new TeamFlowNotFoundError()
      return mapTask(data)
    },

    async deleteTask(taskId) {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .select('id')
        .maybeSingle()

      if (error) throwDatabaseError('할 일 삭제', error)
      if (!data) throw new TeamFlowNotFoundError()
      return data.id
    },

    async createNote(projectId, input) {
      const authorId = await currentProjectMemberId(projectId)
      const { data, error } = await supabase
        .from('notes')
        .insert({
          project_id: projectId,
          title: input.title,
          content: input.content,
          author_id: authorId,
        })
        .select(NOTE_COLUMNS)
        .single()

      if (error) throwDatabaseError('공유 노트 생성', error)
      if (!data) storeError('공유 노트 생성')
      return mapNote(data)
    },

    async updateNote(noteId, patch) {
      const databasePatch = { updated_at: new Date().toISOString() }
      if (hasOwn(patch, 'title')) databasePatch.title = patch.title
      if (hasOwn(patch, 'content')) databasePatch.content = patch.content

      const { data, error } = await supabase
        .from('notes')
        .update(databasePatch)
        .eq('id', noteId)
        .select(NOTE_COLUMNS)
        .maybeSingle()

      if (error) throwDatabaseError('공유 노트 수정', error)
      if (!data) throw new TeamFlowNotFoundError()
      return mapNote(data)
    },

    async deleteNote(noteId) {
      const { data, error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .select('id')
        .maybeSingle()

      if (error) throwDatabaseError('공유 노트 삭제', error)
      if (!data) throw new TeamFlowNotFoundError()
      return data.id
    },

    async createResource(projectId, input) {
      const ownerId = await currentProjectMemberId(projectId)
      const { data, error } = await supabase
        .from('resources')
        .insert({
          project_id: projectId,
          parent_id: input.parentId || null,
          type: input.type,
          name: input.name,
          description: input.description || '',
          url: input.url || null,
          owner_id: ownerId,
        })
        .select(RESOURCE_COLUMNS)
        .single()

      if (error) throwDatabaseError('자료 생성', error)
      if (!data) storeError('자료 생성')
      return mapResource(data)
    },

    async createResourceUpload(projectId, input) {
      const resourceId = randomUUID()
      const storagePath = `${projectId}/${resourceId}`
      const { data: intent, error } = await supabase.rpc('create_resource_upload_intent', {
        p_resource_id: resourceId,
        p_project_id: projectId,
        p_parent_id: input.parentId || null,
        p_type: input.type,
        p_name: input.name,
        p_description: input.description || '',
        p_original_name: input.originalName,
        p_mime_type: input.mimeType,
        p_size_bytes: input.sizeBytes,
      })
      const data = unwrapRpcRow(intent)

      if (error) throwDatabaseError('파일 업로드 준비', error)
      if (!data) storeError('파일 업로드 준비')

      const { data: upload, error: uploadError } = await supabase.storage
        .from(RESOURCE_UPLOAD.BUCKET)
        .createSignedUploadUrl(storagePath)

      const invalidUpload = uploadError
        ?? ((!upload?.token || upload.path !== storagePath)
          ? new Error('Storage가 올바른 업로드 경로와 토큰을 반환하지 않았습니다.')
          : null)
      if (invalidUpload) {
        const { error: cleanupError } = await supabase
          .from('resources')
          .delete()
          .eq('id', resourceId)
        if (cleanupError) storeError('실패한 파일 업로드 정리', cleanupError)
        storeError('파일 업로드 URL 생성', invalidUpload)
      }

      return {
        resource: mapResource(data),
        upload: {
          bucket: RESOURCE_UPLOAD.BUCKET,
          path: upload.path,
          token: upload.token,
        },
      }
    },

    async completeResourceUpload(resourceId) {
      const { data: result, error } = await supabase.rpc('complete_resource_upload', {
        p_resource_id: resourceId,
      })
      const data = unwrapRpcRow(result)

      if (error) throwDatabaseError('파일 업로드 완료', error)
      if (!data) throw new TeamFlowNotFoundError()
      return mapResource(data)
    },

    async createResourceDownloadUrl(resourceId) {
      const { data: resource, error: resourceError } = await supabase
        .from('resources')
        .select(RESOURCE_COLUMNS)
        .eq('id', resourceId)
        .eq('upload_status', 'ready')
        .maybeSingle()

      if (resourceError) throwDatabaseError('파일 다운로드 준비', resourceError)
      if (!resource?.storage_path) throw new TeamFlowNotFoundError()

      const { data, error } = await supabase.storage
        .from(RESOURCE_UPLOAD.BUCKET)
        .createSignedUrl(resource.storage_path, 60, { download: resource.original_name || true })

      if (error || !data?.signedUrl) storeError('파일 다운로드 URL 생성', error)
      return { url: data.signedUrl, expiresIn: 60 }
    },

    async updateResource(resourceId, patch) {
      const databasePatch = { updated_at: new Date().toISOString() }
      if (hasOwn(patch, 'parentId')) databasePatch.parent_id = patch.parentId || null
      if (hasOwn(patch, 'type')) databasePatch.type = patch.type
      if (hasOwn(patch, 'name')) databasePatch.name = patch.name
      if (hasOwn(patch, 'description')) databasePatch.description = patch.description || ''
      if (hasOwn(patch, 'url')) databasePatch.url = patch.url || null

      const { data, error } = await supabase
        .from('resources')
        .update(databasePatch)
        .eq('id', resourceId)
        .select(RESOURCE_COLUMNS)
        .maybeSingle()

      if (error) throwDatabaseError('자료 수정', error)
      if (!data) throw new TeamFlowNotFoundError()
      return mapResource(data)
    },

    async deleteResource(resourceId) {
      const { data: resource, error: resourceError } = await supabase
        .from('resources')
        .select('id,storage_path')
        .eq('id', resourceId)
        .maybeSingle()

      if (resourceError) throwDatabaseError('자료 삭제 준비', resourceError)
      if (!resource) throw new TeamFlowNotFoundError()
      await removeStoredFiles([resource.storage_path], '자료 파일 삭제')

      const { data, error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId)
        .select('id')
        .maybeSingle()

      if (error) throwDatabaseError('자료 삭제', error)
      if (!data) throw new TeamFlowNotFoundError()
      return data.id
    },
  }
}
