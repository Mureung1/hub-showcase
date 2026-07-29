import apiClient from './client';

export async function getTasks(teamId) {
  const res = await apiClient.get('/tasks', { params: { team_id: teamId } });
  return res.data;
}

export async function createTask(teamId, { title, assigneeId, dueDate }) {
  const res = await apiClient.post('/tasks', {
    team_id: teamId,
    title,
    assigneeId,
    dueDate,
  });
  return res.data;
}

export async function updateTaskStatus(teamId, taskId, status, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}`, { team_id: teamId, status, memberId });
  return res.data;
}

export async function updateTaskDueDate(teamId, taskId, dueDate, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/due-date`, {
    team_id: teamId,
    dueDate,
    memberId,
  });
  return res.data;
}

export async function updateTaskTitle(teamId, taskId, title, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/title`, { team_id: teamId, title, memberId });
  return res.data;
}

export async function updateTaskAssignee(teamId, taskId, assigneeId, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/assignee`, {
    team_id: teamId,
    assigneeId,
    memberId,
  });
  return res.data;
}

export async function archiveTask(teamId, taskId, memberId) {
  const res = await apiClient.delete(`/tasks/${taskId}`, {
    data: { team_id: teamId, memberId },
  });
  return res.data;
}

export async function getArchivedTasks(teamId) {
  const res = await apiClient.get('/tasks/archived', { params: { team_id: teamId } });
  return res.data;
}

export async function restoreTask(teamId, taskId, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/restore`, { team_id: teamId, memberId });
  return res.data;
}
