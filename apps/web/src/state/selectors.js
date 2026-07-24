import { calculateProgress } from '@teamflow/shared'

export function selectProject(state, projectId) {
  return state.projects.find((project) => project.id === projectId) ?? null
}

export function selectProjectTasks(state, projectId) {
  return state.tasks.filter((task) => task.projectId === projectId)
}

export function selectProjectMembers(state, projectId) {
  const project = selectProject(state, projectId)
  return project ? state.members.filter((member) => project.memberIds.includes(member.id)) : []
}

export function selectAssignableProjectMembers(state, projectId) {
  const enabledAiMemberIds = new Set(selectProjectAiAgents(state, projectId)
    .filter((agent) => agent.enabled)
    .map((agent) => agent.memberId))
  return selectProjectMembers(state, projectId).filter((member) => (
    member.kind === 'user'
    || (member.kind === 'ai' && enabledAiMemberIds.has(member.id))
  ))
}

export function selectProjectAiMembers(state, projectId) {
  return selectProjectMembers(state, projectId).filter((member) => (
    member.kind === 'ai' || member.isAi
  ))
}

export function selectProjectAiAgents(state, projectId) {
  const aiMemberIds = new Set(selectProjectAiMembers(state, projectId).map((member) => member.id))
  return (state.aiAgents ?? []).filter((agent) => (
    agent.projectId === projectId && aiMemberIds.has(agent.memberId)
  ))
}

export function selectProjectAiAgent(state, projectId, memberId) {
  const agents = selectProjectAiAgents(state, projectId)
  if (memberId) return agents.find((agent) => agent.memberId === memberId) ?? null
  return agents[0] ?? null
}

export function selectProjectAiMember(state, projectId, memberId) {
  const members = selectProjectAiMembers(state, projectId)
  if (memberId) return members.find((member) => member.id === memberId) ?? null
  return members[0] ?? null
}

export function selectProjectAiRuns(state, projectId, memberId) {
  return [...(state.aiRuns ?? [])]
    .filter((run) => run.projectId === projectId && (!memberId || run.aiMemberId === memberId))
    .sort((left, right) => (
      String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''))
      || String(right.id).localeCompare(String(left.id))
    ))
}

export function selectProjectSummaries(state) {
  return state.projects.map((project) => {
    const tasks = selectProjectTasks(state, project.id)
    return {
      ...project,
      progress: calculateProgress(tasks),
      members: state.members.filter((member) => project.memberIds.includes(member.id)),
    }
  })
}

export function selectReceivedInvitations(state) {
  return (state.invitations ?? []).filter((invitation) => (
    invitation.status === 'pending' && invitation.direction !== 'sent'
  ))
}
