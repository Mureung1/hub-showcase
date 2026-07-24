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
  return selectProjectMembers(state, projectId).filter((member) => (
    member.kind === 'user' || member.kind === 'ai'
  ))
}

export function selectProjectAiMember(state, projectId) {
  return selectProjectMembers(state, projectId).find((member) => (
    member.kind === 'ai' || member.isAi
  )) ?? null
}

export function selectProjectAiAgent(state, projectId) {
  const aiMember = selectProjectAiMember(state, projectId)
  return (state.aiAgents ?? []).find((agent) => (
    agent.projectId === projectId
    && (!aiMember || agent.memberId === aiMember.id)
  )) ?? null
}

export function selectProjectAiRuns(state, projectId) {
  return [...(state.aiRuns ?? [])]
    .filter((run) => run.projectId === projectId)
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
