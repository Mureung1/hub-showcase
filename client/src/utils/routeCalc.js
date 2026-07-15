import { haversineDistanceKm } from './geo.js';

// 프론트 미리보기용 동선 계산(완전탐색). 최종 계산은 server/src/services/routeService.js에서 수행.
// 선택 개수가 많아지면(6개 이상) 계승적으로 느려지므로 서버는 휴리스틱으로 전환 — 프론트 미리보기는
// 선택 화면(핵심 흐름) 규모에서만 쓰인다는 전제로 완전탐색을 그대로 사용한다.
export const RANK_COLORS = ['#FF7A1A', '#2F63EA', '#E23A63', '#3FA07D', '#8B6BD6', '#D6883A'];

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  arr.forEach((item, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    permutations(rest).forEach((p) => result.push([item, ...p]));
  });
  return result;
}

function totalDistanceKm(order) {
  let sum = 0;
  for (let i = 0; i < order.length - 1; i++) sum += haversineDistanceKm(order[i], order[i + 1]);
  return sum;
}

// 사용자 위치(origin)를 출발점으로 고정하고, 선택한 빵집(chosen)들을 방문하는 상위 3개 경로를 반환한다.
// 출발점이 고정되면 정방향/역방향의 총 거리가 서로 달라지므로(첫 구간이 origin→order[0]로 비대칭),
// 예전처럼 역방향을 같은 경로로 취급해 중복 제거할 필요가 없다 — 순열 자체가 이미 서로 다른 경로다.
export function computeTopRoutes(origin, chosen) {
  const all = permutations(chosen).map((order) => ({
    order,
    dist: haversineDistanceKm(origin, order[0]) + totalDistanceKm(order),
  }));
  all.sort((a, b) => a.dist - b.dist);
  return all.slice(0, 3);
}

// 저장된 코스(순서 고정)를 다시 계산된 top routes에서 찾을 때 쓴다. 출발점이 고정된 이후로는
// 정방향 순서만 같은 경로로 취급한다(역방향은 이제 다른 경로이므로 매치 대상이 아니다).
export function routesMatch(order, ids) {
  if (order.length !== ids.length) return false;
  return order.every((v, i) => v.id === ids[i]);
}

const MODE_SPEED_KMH = { walk: 4, car: 25, bus: 15 };

export function estimateMinutes(km, mode) {
  return Math.max(1, Math.round((km / MODE_SPEED_KMH[mode]) * 60));
}
