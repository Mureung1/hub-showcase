import apiClient from './client';

export async function getCurrentTeam() {
  const res = await apiClient.get('/teams/current');
  return res.data;
}

export async function getTeamByCode(code) {
  const res = await apiClient.get('/teams/by-code', { params: { code } });
  return res.data;
}
