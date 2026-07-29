import { estimateMinutes } from '../utils/routeCalc.js';

const RANK_LABELS = ['가장 빠른 경로', '2순위 경로', '3순위 경로'];

// color는 route-map-center의 선/핀 색과 같은 값을 넘겨받아, 카드와 지도 위 해당 동선이
// 같은 색으로 바로 연결되어 보이게 한다(강조 요청 반영 — 어떤 카드가 지도의 어떤 선인지 한눈에).
export default function RankCard({ route, index, active, color, onClick }) {
  const km = route.dist.toFixed(1);
  const minutes = estimateMinutes(route.dist, 'walk');
  const path = route.order.map((b) => b.name).join(' → ');
  return (
    <button
      type="button"
      className={`rank-card${active ? ' active' : ''}`}
      style={{ '--rank-accent': color }}
      onClick={onClick}
    >
      <div className="rank-card-title">{RANK_LABELS[index] || `${index + 1}순위 경로`}</div>
      <div className="rank-card-stats">
        {km}km · 약 {minutes}분 · {route.order.length}곳
      </div>
      <div className="rank-card-path">{path}</div>
    </button>
  );
}
