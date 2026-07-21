import api from './client.js';

// origin: {lat, lng}, bakeries: [{id, lat, lng}, ...] — 위치 데이터만 보내고 계산은 서버가 한다(CLAUDE.md).
export async function fetchTopRoutes({ origin, bakeries }) {
  const res = await api.post('/routes', {
    origin,
    bakeries: bakeries.map((b) => ({ id: b.id, lat: b.lat, lng: b.lng })),
  });
  return res.data.data.routes; // [{ order: [id, id, ...], distanceKm }, ...]
}
