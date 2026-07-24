import apiClient from './client';

export async function getCurrentTeam() {
  const res = await apiClient.get('/teams/current');
  return res.data;
}
