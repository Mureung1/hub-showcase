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

function sameRoute(a, b) {
  if (a.length !== b.length) return false;
  const forward = a.every((v, i) => v.id === b[i].id);
  const backward = a.every((v, i) => v.id === b[b.length - 1 - i].id);
  return forward || backward;
}

// 선택된 빵집 목록을 받아 상위 3개의 서로 다른(역방향 제외) 경로를 반환한다. dist는 실거리(km, 직선거리 근사).
export function computeTopRoutes(chosen) {
  const all = permutations(chosen).map((order) => ({ order, dist: totalDistanceKm(order) }));
  all.sort((a, b) => a.dist - b.dist);
  const top = [];
  for (const r of all) {
    if (top.some((t) => sameRoute(t.order, r.order))) continue;
    top.push(r);
    if (top.length === 3) break;
  }
  return top;
}

export function routesMatch(order, ids) {
  if (order.length !== ids.length) return false;
  const forward = order.every((v, i) => v.id === ids[i]);
  const backward = order.every((v, i) => v.id === ids[ids.length - 1 - i]);
  return forward || backward;
}

const MODE_SPEED_KMH = { walk: 4, car: 25, bus: 15 };

export function estimateMinutes(km, mode) {
  return Math.max(1, Math.round((km / MODE_SPEED_KMH[mode]) * 60));
}
