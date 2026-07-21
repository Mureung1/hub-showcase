import apiClient from './client';

export async function getActivityLogs() {
  const res = await apiClient.get('/activity-logs');
  return res.data;
}
