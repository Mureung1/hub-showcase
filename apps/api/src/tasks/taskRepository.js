const TASK_COLUMNS = [
  'id',
  'project_id',
  'title',
  'assignee_id',
  'due_date',
  'status',
  'description',
  'created_at',
].join(',')

export class TaskStoreError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = 'TaskStoreError'
  }
}

export function mapTaskRow(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    status: row.status,
    description: row.description ?? '',
  }
}

export function mapTaskInput(input) {
  return {
    project_id: input.projectId,
    title: input.title,
    assignee_id: input.assigneeId,
    due_date: input.dueDate,
    status: input.status,
    description: input.description || null,
  }
}

function throwTaskStoreError(operation, error) {
  throw new TaskStoreError(`할 일 ${operation}에 실패했습니다.`, { cause: error })
}

export function createSupabaseTaskRepository(supabase) {
  return {
    async listTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_COLUMNS)
        .order('created_at', { ascending: false })

      if (error) {
        throwTaskStoreError('조회', error)
      }

      return data.map(mapTaskRow)
    },

    async createTask(input) {
      const { data, error } = await supabase
        .from('tasks')
        .insert(mapTaskInput(input))
        .select(TASK_COLUMNS)
        .single()

      if (error) {
        throwTaskStoreError('생성', error)
      }

      return { ...mapTaskRow(data), isNew: true }
    },
  }
}
