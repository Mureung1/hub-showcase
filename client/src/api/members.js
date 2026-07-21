import apiClient from './client';

export async function getMembers() {
  const res = await apiClient.get('/members');
  return res.data;
}
