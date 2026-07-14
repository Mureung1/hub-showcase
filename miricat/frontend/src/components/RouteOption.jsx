export default function RouteOption({ candidate, selected, onSelect }) {
  return (
    <button className={selected ? "route-opt on" : "route-opt"} onClick={onSelect}>
      <div className="r1">{candidate.name} · {candidate.durationMin}분 <span className="mono">{candidate.lineBadge}</span></div>
      <div className="r2">{candidate.road} 경유 · 정류장 {candidate.stationCount}개</div>
    </button>
  );
}