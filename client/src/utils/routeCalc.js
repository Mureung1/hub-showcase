// 동선 계산(순열 탐색)은 server/src/services/routeService.js로 이전했다(CLAUDE.md: 서버에서 계산).
// 여기 남은 건 화면 표시용 헬퍼뿐 — 서버 응답(순서+거리)을 받아 그리는 쪽에서 쓴다.
export const RANK_COLORS = ['#FF7A1A', '#2F63EA', '#E23A63', '#3FA07D', '#8B6BD6', '#D6883A'];

const MODE_SPEED_KMH = { walk: 4, car: 25, bus: 15 };

export function estimateMinutes(km, mode) {
  return Math.max(1, Math.round((km / MODE_SPEED_KMH[mode]) * 60));
}
