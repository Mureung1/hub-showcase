import { CURRENT_USER_ID, initialAiAgents, initialAiRuns, initialMembers, initialNotes, initialProjects, initialResources, initialTasks } from './teamFlowFixture.js'

let sequence = 1000

const nextId = (prefix) => `${prefix}-${Date.now()}-${sequence++}`
const clone = (value) => structuredClone(value)
const createdAiRuns = new Map()

/**
 * Mutable in-memory repository used only by component tests.
 */
export const testTeamFlowRepository = {
  refreshOnEntry: false,
  load() {
    return Promise.resolve(clone({
      projects: initialProjects,
      members: initialMembers,
      tasks: initialTasks,
      notes: initialNotes,
      resources: initialResources,
      aiAgents: initialAiAgents,
      aiRuns: initialAiRuns,
      currentUserId: CURRENT_USER_ID,
      currentMemberIdsByProject: Object.fromEntries(initialProjects.map((project) => [project.id, CURRENT_USER_ID])),
      invitations: [],
      accessMode: 'authenticated',
      capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: true },
    }))
  },

  createProject(input) {
    return Promise.resolve({
      id: nextId('project'),
      memberIds: [CURRENT_USER_ID],
      creatorId: CURRENT_USER_ID,
      iconKey: 'layers',
      ...input,
    })
  },

  updateProject(projectId, patch) {
    return Promise.resolve({ projectId, patch })
  },

  deleteProject(projectId) {
    return Promise.resolve({ projectId })
  },

  createTask(projectId, input) {
    return Promise.resolve({ id: nextId('task'), projectId, isNew: true, ...input })
  },

  updateTask(taskId, patch) {
    return Promise.resolve({ taskId, patch })
  },

  deleteTask(taskId) {
    return Promise.resolve({ taskId })
  },

  updateMember(memberId, patch) {
    return Promise.resolve({ memberId, patch })
  },

  deleteMember(memberId) {
    const project = initialProjects.find((candidate) => candidate.memberIds.includes(memberId))
    return Promise.resolve({ memberId, projectId: project?.id ?? '1' })
  },

  createInvitation(projectId, input) {
    return Promise.resolve({
      id: nextId('invitation'), projectId, projectName: '팀플 관리 웹서비스 (TeamFlow)',
      inviteeEmail: input.inviteeEmail, inviterName: '이주환', status: 'pending', direction: 'sent',
    })
  },

  acceptInvitation(invitationId) { return Promise.resolve({ invitationId }) },
  rejectInvitation(invitationId) { return Promise.resolve({ invitationId }) },
  cancelInvitation(invitationId) { return Promise.resolve({ invitationId }) },

  createNote(projectId, input) {
    return Promise.resolve({ id: nextId('note'), projectId, ...input })
  },

  updateNote(noteId, patch) {
    return Promise.resolve({ noteId, patch })
  },

  deleteNote(noteId) {
    return Promise.resolve({ noteId })
  },

  createResource(projectId, input) {
    return Promise.resolve({ id: nextId('resource'), projectId, ...input })
  },

  uploadResource(projectId, { file, ...input }) {
    return Promise.resolve({
      id: nextId('resource'),
      projectId,
      type: file?.type?.startsWith('image/') ? 'image' : 'document',
      originalName: file?.name ?? '',
      mimeType: file?.type || 'application/octet-stream',
      sizeBytes: file?.size ?? 0,
      storagePath: `${projectId}/test-file`,
      uploadStatus: 'ready',
      ...input,
    })
  },

  updateResource(resourceId, patch) {
    return Promise.resolve({ resourceId, patch })
  },

  deleteResource(resourceId) {
    return Promise.resolve({ resourceId })
  },

  getResourceDownloadUrl() {
    return Promise.resolve({ url: 'https://example.com/download', expiresIn: 60 })
  },

  createAiAgent(projectId) {
    const member = {
      id: nextId('member-ai'), projectId, authUserId: null, email: null, kind: 'ai',
      name: '자료조사 AI', initial: 'AI', role: '자료 조사', description: '', isAi: true, color: '#3d4a63',
    }
    return Promise.resolve({
      member,
      aiAgent: {
        memberId: member.id, projectId, instructions: '',
        contextConfig: { project: true, notes: true, tasks: true, team: false, resources: true },
        enabled: true, createdAt: '2026-07-24T00:00:00.000Z', updatedAt: '2026-07-24T00:00:00.000Z',
      },
    })
  },

  updateAiAgent(memberId, input) {
    const existing = initialAiAgents.find((agent) => agent.memberId === memberId)
    return Promise.resolve({
      ...(existing ?? { memberId, projectId: '1', enabled: true, createdAt: '2026-07-24T00:00:00.000Z' }),
      ...input,
      updatedAt: '2026-07-24T01:00:00.000Z',
    })
  },

  createAiRun(memberId, taskId) {
    const task = initialTasks.find((candidate) => candidate.id === taskId)
    const aiRun = {
      id: nextId('ai-run'), projectId: task?.projectId ?? '1', aiMemberId: memberId, taskId,
      status: 'pending_review', contextSnapshot: { task: { id: taskId, title: task?.title ?? 'Mock 작업' } },
      resultMarkdown: '# 모의 실행 결과\n\n## 작업 요청 요약\n- 테스트 Mock 결과입니다.',
      errorMessage: null, appliedNoteId: null, createdBy: 'auth-user-1',
      createdAt: '2026-07-24T02:00:00.000Z', updatedAt: '2026-07-24T02:00:00.000Z',
    }
    createdAiRuns.set(aiRun.id, aiRun)
    return Promise.resolve(aiRun)
  },

  applyAiRun(runId) {
    const source = createdAiRuns.get(runId) ?? initialAiRuns.find((run) => run.id === runId)
    const aiRun = { ...source, id: runId, status: 'applied', appliedNoteId: `note-${runId}` }
    createdAiRuns.set(runId, aiRun)
    return Promise.resolve({
      aiRun,
      note: {
        id: aiRun.appliedNoteId, projectId: aiRun.projectId, title: 'AI 결과 · Mock 작업',
        content: aiRun.resultMarkdown, authorId: CURRENT_USER_ID,
        createdAt: '2026-07-24T02:10:00.000Z', updatedAt: '2026-07-24T02:10:00.000Z',
      },
    })
  },

  rejectAiRun(runId) {
    const source = createdAiRuns.get(runId) ?? initialAiRuns.find((run) => run.id === runId)
    const aiRun = { ...source, id: runId, status: 'rejected' }
    createdAiRuns.set(runId, aiRun)
    return Promise.resolve(aiRun)
  },
}
