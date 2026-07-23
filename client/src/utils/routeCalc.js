// 동선 계산(순열 탐색)은 server/src/services/routeService.js로 이전했다(CLAUDE.md: 서버에서 계산).
// 여기 남은 건 화면 표시용 헬퍼뿐 — 서버 응답(순서+거리)을 받아 그리는 쪽에서 쓴다.
// design.md: 차트/경로선은 비비드보다 파스텔에 가깝게 — 대시보드 톤에 맞춰 채도를 낮춘 팔레트.
export const RANK_COLORS = ['#FF7A1A', '#5A82E8', '#E2607F', '#4FAE8A', '#9B85D6', '#C99257'];

export const MODES = [
  ['walk', '도보'],
  ['car', '자동차'],
  ['bus', '버스'],
];

const MODE_SPEED_KMH = { walk: 4, car: 25, bus: 15 };

export function estimateMinutes(km, mode) {
  return Math.max(1, Math.round((km / MODE_SPEED_KMH[mode]) * 60));
}
