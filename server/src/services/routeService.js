// CLAUDE.md 결정사항: 동선 계산은 서버에서. 프론트는 위치 데이터(origin + 선택한 빵집의 id/lat/lng)만 보낸다.

function haversineDistanceKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  arr.forEach((item, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    permutations(rest).forEach((p) => result.push([item, ...p]));
  });
  return result;
}

function totalLegDistance(order) {
  let sum = 0;
  for (let i = 0; i < order.length - 1; i++) sum += haversineDistanceKm(order[i], order[i + 1]);
  return sum;
}

// 선택 8곳까지는 완전탐색(8! = 40320, 충분히 빠름). 그 이상은 순열 폭발(9!=362880...)이 부담스러워
// 최근접 이웃 휴리스틱으로 전환 — 최적은 아니지만 합리적인 시간 안에 그럴듯한 경로 하나를 만든다.
const EXACT_SEARCH_LIMIT = 8;

function exactTopRoutes(origin, chosen) {
  const all = permutations(chosen).map((order) => ({
    order: order.map((b) => b.id),
    distanceKm: haversineDistanceKm(origin, order[0]) + totalLegDistance(order),
  }));
  all.sort((a, b) => a.distanceKm - b.distanceKm);
  return all.slice(0, 3);
}

function nearestNeighborRoute(origin, chosen) {
  const remaining = [...chosen];
  const order = [];
  let current = origin;
  while (remaining.length) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((b, i) => {
      const d = haversineDistanceKm(current, b);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
    const [next] = remaining.splice(nearestIdx, 1);
    order.push(next);
    current = next;
  }
  return [{ order: order.map((b) => b.id), distanceKm: haversineDistanceKm(origin, order[0]) + totalLegDistance(order) }];
}

// origin: {lat, lng}, bakeries: [{id, lat, lng}, ...] (2곳 이상)
// 반환: 상위 3개(또는 휴리스틱이면 1개) 경로 — 각각 { order: [id, id, ...], distanceKm }
export function computeTopRoutes(origin, bakeries) {
  if (bakeries.length > EXACT_SEARCH_LIMIT) return nearestNeighborRoute(origin, bakeries);
  return exactTopRoutes(origin, bakeries);
}
