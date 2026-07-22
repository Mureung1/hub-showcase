const MEMBER_COLUMNS = [
  'id',
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
  'name',
  'description',
  'status',
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

function storeError(operation, error) {
  throw new TeamFlowStoreError(`${operation}에 실패했습니다.`, { cause: error })
}

function initialFor(name) {
  return Array.from(name.trim()).slice(0, 1).join('') || 'T'
}

function mapMember(row) {
  return {
    id: row.id,
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

function unwrapRpcRow(data) {
  return Array.isArray(data) ? data[0] : data
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

export function createSupabaseTeamFlowRepository(supabase, user) {
  async function ensureOwnerMember() {
    const member = {
      workspace_owner_id: user.id,
      auth_user_id: user.id,
      name: user.displayName,
      initial: initialFor(user.displayName),
      role: '프로젝트 생성자',
      description: '',
      avatar_url: user.avatarUrl,
      color: '#3a6898',
      is_ai: false,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('members')
      .upsert(member, { onConflict: 'workspace_owner_id,auth_user_id' })
      .select(MEMBER_COLUMNS)
      .single()

    if (error || !data) storeError('사용자 초기화', error)
    return mapMember(data)
  }

  async function currentMember() {
    const { data, error } = await supabase
      .from('members')
      .select(MEMBER_COLUMNS)
      .eq('auth_user_id', user.id)
      .single()

    if (error || !data) storeError('현재 사용자 조회', error)
    return mapMember(data)
  }

  return {
    async load() {
      const ownerMember = await ensureOwnerMember()
      const [projectsResult, membersResult, projectMembersResult, tasksResult] = await Promise.all([
        supabase.from('projects').select(PROJECT_COLUMNS).order('created_at', { ascending: false }),
        supabase.from('members').select(MEMBER_COLUMNS).order('created_at', { ascending: true }),
        supabase.from('project_members').select('project_id,member_id'),
        supabase.from('tasks').select(TASK_COLUMNS).order('created_at', { ascending: false }),
      ])

      const failed = [projectsResult, membersResult, projectMembersResult, tasksResult]
        .find((result) => result.error)
      if (failed) storeError('워크스페이스 조회', failed.error)

      const memberIdsByProject = new Map()
      for (const relation of projectMembersResult.data) {
        const memberIds = memberIdsByProject.get(relation.project_id) ?? []
        memberIds.push(relation.member_id)
        memberIdsByProject.set(relation.project_id, memberIds)
      }

      return {
        projects: projectsResult.data.map((project) => ({
          ...mapProject(project, memberIdsByProject.get(project.id) ?? []),
          creatorId: ownerMember.id,
        })),
        members: membersResult.data.map(mapMember),
        tasks: tasksResult.data.map((task) => mapTask(task)),
        notes: [],
        resources: [],
        aiSettings: {},
        aiHistory: [],
        currentUserId: ownerMember.id,
        aiMemberId: '',
        accessMode: 'authenticated',
        capabilities: {
          projects: true,
          members: true,
          tasks: true,
          notes: false,
          resources: false,
          ai: false,
        },
      }
    },

    async createProject(input) {
      const ownerMember = await currentMember()
      const { data, error } = await supabase.rpc('create_project_with_owner', {
        p_name: input.name,
        p_description: input.description,
        p_status: input.status,
        p_start_date: input.startDate || null,
        p_end_date: input.endDate || null,
      })
      const row = unwrapRpcRow(data)
      if (error || !row) storeError('프로젝트 생성', error)

      return {
        ...mapProject(row, [ownerMember.id]),
        creatorId: ownerMember.id,
      }
    },

    async updateProject(projectId, patch) {
      const databasePatch = {
        start_date: patch.startDate || null,
        end_date: patch.endDate || null,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('projects')
        .update(databasePatch)
        .eq('id', projectId)
        .select(PROJECT_COLUMNS)
        .maybeSingle()

      if (error) storeError('프로젝트 수정', error)
      if (!data) throw new TeamFlowNotFoundError()
      return mapProject(data)
    },

    async createMember(projectId, input) {
      const { data, error } = await supabase.rpc('add_project_member', {
        p_project_id: projectId,
        p_name: input.name,
        p_initial: input.initial,
        p_role: input.role,
        p_description: input.description,
        p_color: input.color,
      })
      const row = unwrapRpcRow(data)
      if (error || !row) storeError('팀원 생성', error)
      return mapMember(row)
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
          description: input.description || null,
        })
        .select(TASK_COLUMNS)
        .single()

      if (error || !data) storeError('할 일 생성', error)
      return mapTask(data, true)
    },

    async updateTask(taskId, patch) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: patch.status, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select(TASK_COLUMNS)
        .maybeSingle()

      if (error) storeError('할 일 수정', error)
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

      if (error) storeError('할 일 삭제', error)
      if (!data) throw new TeamFlowNotFoundError()
      return data.id
    },
  }
}
