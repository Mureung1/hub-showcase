import apiClient from './client';

export async function getCurrentTeam(teamId) {
  const res = await apiClient.get('/teams/current', { params: { team_id: teamId } });
  return res.data;
}

export async function getTeamByCode(code) {
  const res = await apiClient.get('/teams/by-code', { params: { code } });
  return res.data;
}
