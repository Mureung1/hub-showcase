import api from './client.js';

export async function fetchMe() {
  const res = await api.get('/users/me');
  return res.data.data; // { id, taste, visited: [bakeryId], wishlist: [bakeryId] }
}

export async function toggleBakeryStatus(bakeryId, status) {
  const res = await api.post('/users/me/toggle-status', { bakeryId, status });
  return res.data.data.active;
}
