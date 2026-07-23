import { AI_MEMBER_ID, aiHistory, CURRENT_USER_ID, initialAiSettings, initialMembers, initialNotes, initialProjects, initialResources, initialTasks } from './teamFlowFixture.js'

let sequence = 1000

const nextId = (prefix) => `${prefix}-${Date.now()}-${sequence++}`
const clone = (value) => structuredClone(value)

/**
 * Mutable in-memory repository used only by component tests.
 */
export const testTeamFlowRepository = {
  refreshOnEntry: false,
  load() {
    return Promise.resolve(clone({
      projects: initialProjects,
      members: initialMembers.map((member) => ({
        ...member,
        kind: member.id === CURRENT_USER_ID ? 'user' : 'manual',
        authUserId: member.id === CURRENT_USER_ID ? 'auth-user-1' : null,
        email: member.id === CURRENT_USER_ID ? 'user@example.com' : '',
      })),
      tasks: initialTasks,
      notes: initialNotes,
      resources: initialResources,
      aiSettings: initialAiSettings,
      aiHistory,
      currentUserId: CURRENT_USER_ID,
      currentMemberIdsByProject: Object.fromEntries(initialProjects.map((project) => [project.id, CURRENT_USER_ID])),
      invitations: [],
      aiMemberId: AI_MEMBER_ID,
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

  createMember(projectId, input) {
    return Promise.resolve({ projectId, member: { id: nextId('member'), projectId, kind: 'manual', authUserId: null, email: '', isAi: false, ...input } })
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

  updateResource(resourceId, patch) {
    return Promise.resolve({ resourceId, patch })
  },

  deleteResource(resourceId) {
    return Promise.resolve({ resourceId })
  },

  updateAiSettings(projectId, patch) {
    return Promise.resolve({ projectId, patch })
  },
}
