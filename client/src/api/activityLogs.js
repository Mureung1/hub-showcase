import apiClient from './client';

export async function getActivityLogs(teamId) {
  const res = await apiClient.get('/activity-logs', { params: { team_id: teamId } });
  return res.data;
}
