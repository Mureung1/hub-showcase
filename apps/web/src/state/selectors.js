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
