const EARTH_RADIUS_KM = 6371;

// 두 지점(lat/lng) 사이의 실제 거리(km). 프론트 미리보기 동선 계산과 "내 주변 가까운 순" 정렬에 사용.
export function haversineDistanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// lat/lng 좌표 목록을 0~100 사각 뷰박스 좌표로 정규화한다.
// RouteScreen의 미니맵(SVG)처럼 실제 축척 없이 상대적 배치만 보여주면 되는 곳 전용 — 실제 지도(NaverMapCanvas)에는 쓰지 않는다.
export function normalizeToViewBox(points, padding = 15) {
  if (points.length === 1) return [{ ...points[0], x: 50, y: 50 }];

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const spanLat = Math.max(...lats) - Math.min(...lats) || 1;
  const spanLng = Math.max(...lngs) - Math.min(...lngs) || 1;
  const minLat = Math.min(...lats);
  const minLng = Math.min(...lngs);
  const range = 100 - padding * 2;

  return points.map((p) => ({
    ...p,
    x: padding + ((p.lng - minLng) / spanLng) * range,
    // 위도가 클수록 북쪽(화면 위쪽)이라 y축은 반전
    y: padding + (1 - (p.lat - minLat) / spanLat) * range,
  }));
}
