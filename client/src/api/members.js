import apiClient from './client';

export async function getMembers(teamId) {
  const res = await apiClient.get('/members', { params: { team_id: teamId } });
  return res.data;
}
