import { AI_MEMBER_ID, CURRENT_USER_ID, initialAiSettings, initialMembers, initialNotes, initialProjects, initialResources, initialTasks } from './mockData.js'

let sequence = 1000

const nextId = (prefix) => `${prefix}-${Date.now()}-${sequence++}`
const clone = (value) => structuredClone(value)

/**
 * Session-only repository. Its method surface is intentionally API-shaped so
 * an Express implementation can replace it without changing page components.
 */
export const mockTeamFlowRepository = {
  load() {
    return Promise.resolve(clone({
      projects: initialProjects,
      members: initialMembers,
      tasks: initialTasks,
      notes: initialNotes,
      resources: initialResources,
      aiSettings: initialAiSettings,
      currentUserId: CURRENT_USER_ID,
      aiMemberId: AI_MEMBER_ID,
    }))
  },

  createProject(input) {
    return Promise.resolve({
      id: nextId('project'),
      memberIds: [CURRENT_USER_ID],
      creatorId: CURRENT_USER_ID,
      ...input,
    })
  },

  updateProject(projectId, patch) {
    return Promise.resolve({ projectId, patch })
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
    return Promise.resolve({ projectId, member: { id: nextId('member'), isAi: false, ...input } })
  },

  createNote(projectId, input) {
    return Promise.resolve({ id: nextId('note'), projectId, ...input })
  },

  updateNote(noteId, patch) {
    return Promise.resolve({ noteId, patch })
  },

  createResource(projectId, input) {
    return Promise.resolve({ id: nextId('resource'), projectId, ...input })
  },

  updateAiSettings(projectId, patch) {
    return Promise.resolve({ projectId, patch })
  },
}
