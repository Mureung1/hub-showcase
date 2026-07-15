const RANK_LABELS = ['가장 빠른 경로', '2순위', '3순위'];

export default function RankCard({ route, index, active, originLabel, onClick }) {
  const km = route.dist.toFixed(1);
  const path = [originLabel, ...route.order.map((b) => b.name)].join(' → ');
  return (
    <button type="button" className={`rank-card${active ? ' active' : ''}`} onClick={onClick}>
      <div className="tag">{index + 1}순위</div>
      <div className="title">{RANK_LABELS[index] || `${index + 1}순위`}</div>
      <div className="meta">
        {path}
        <br />약 {km}km
      </div>
    </button>
  );
}
