import apiClient from './client';

export async function getTasks() {
  const res = await apiClient.get('/tasks');
  return res.data;
}

export async function createTask({ title, assigneeId, dueDate }) {
  const res = await apiClient.post('/tasks', {
    title,
    assigneeId,
    dueDate,
  });
  return res.data;
}

export async function updateTaskStatus(taskId, status, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}`, { status, memberId });
  return res.data;
}

export async function updateTaskDueDate(taskId, dueDate, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/due-date`, {
    dueDate,
    memberId,
  });
  return res.data;
}

export async function updateTaskTitle(taskId, title, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/title`, { title, memberId });
  return res.data;
}

export async function updateTaskAssignee(taskId, assigneeId, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/assignee`, {
    assigneeId,
    memberId,
  });
  return res.data;
}

export async function archiveTask(taskId, memberId) {
  const res = await apiClient.delete(`/tasks/${taskId}`, {
    data: { memberId },
  });
  return res.data;
}

export async function getArchivedTasks() {
  const res = await apiClient.get('/tasks/archived');
  return res.data;
}

export async function restoreTask(taskId, memberId) {
  const res = await apiClient.patch(`/tasks/${taskId}/restore`, { memberId });
  return res.data;
}
