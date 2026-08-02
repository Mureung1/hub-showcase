// TMap 대중교통(버스/지하철) 경로안내 API로 실제 소요시간을 구한다.
// 주의: 이 API는 "두 지점 사이" 경로만 계산해준다 — "여러 빵집을 어떤 순서로 돌아야 가장 효율적인지"
// 정하는 문제(routeService.js의 완전탐색/최근접 이웃)와는 완전히 다른 문제라, 저 알고리즘을 대체하지
// 않는다. 이미 정해진 방문 순서(origin → 빵집1 → 빵집2 → ...)의 구간(leg)마다 이 API를 불러서 실제
// 대중교통 소요시간을 합산하는 용도로만 쓴다 — routeCalc.js의 거리 기반 근사치를 "버스" 모드에서만
// 대체한다(도보/자동차는 TMap 대중교통 API 대상이 아니라 근사치를 그대로 둠).
const TMAP_TRANSIT_URL = 'https://apis.openapi.sk.com/transit/routes';

async function fetchLegSeconds(a, b) {
  const res = await fetch(TMAP_TRANSIT_URL, {
    method: 'POST',
    headers: {
      appKey: process.env.TMAP_APP_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      startX: String(a.lng),
      startY: String(a.lat),
      endX: String(b.lng),
      endY: String(b.lat),
      count: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`TMap 대중교통 API 응답 실패 (${res.status})`);
  }
  const body = await res.json();
  const totalTime = body?.metaData?.plan?.itineraries?.[0]?.totalTime;
  if (typeof totalTime !== 'number') {
    // 대중교통으로 갈 수 없는 구간(도보 이동만 가능한 거리 등)일 때 TMap이 itineraries를 비워서 줄 수 있다.
    throw new Error('해당 구간의 대중교통 경로를 찾지 못했어요.');
  }
  return totalTime; // seconds
}

// points: [{lat, lng}, ...] — 출발지부터 방문 순서대로. 최소 2개 이상.
export async function computeTransitMinutes(points) {
  if (!process.env.TMAP_APP_KEY) {
    const err = new Error('TMAP_APP_KEY가 설정되지 않았어요.');
    err.status = 500;
    err.code = 'TMAP_NOT_CONFIGURED';
    throw err;
  }

  const legs = [];
  for (let i = 0; i < points.length - 1; i++) legs.push([points[i], points[i + 1]]);

  const secondsPerLeg = await Promise.all(legs.map(([a, b]) => fetchLegSeconds(a, b)));
  const totalSeconds = secondsPerLeg.reduce((sum, s) => sum + s, 0);
  return Math.max(1, Math.round(totalSeconds / 60));
}
