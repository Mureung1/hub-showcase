import api from './client.js';

// origin: {lat, lng}, bakeries: [{id, lat, lng}, ...] — 위치 데이터만 보내고 계산은 서버가 한다(CLAUDE.md).
export async function fetchTopRoutes({ origin, bakeries }) {
  const res = await api.post('/routes', {
    origin,
    bakeries: bakeries.map((b) => ({ id: b.id, lat: b.lat, lng: b.lng })),
  });
  return res.data.data.routes; // [{ order: [id, id, ...], distanceKm }, ...]
}

// points: [{lat, lng}, ...] — 이미 정해진 방문 순서(출발지 포함) 그대로. TMap 대중교통 API로 실제
// 버스/지하철 소요시간을 구한다("버스" 모드 전용 — 도보/자동차는 여전히 거리 기반 근사치).
export async function fetchTransitMinutes(points) {
  const res = await api.post('/routes/transit-time', { points });
  return res.data.data.minutes;
}
