// 경로 후보 카드 하나. candidate = /api/route-candidates 응답 원소 (실데이터).
export default function RouteOption({ candidate, selected, onSelect }) {
  const driving = candidate.mode === "driving";
  return (
    <button className={selected ? "route-opt on" : "route-opt"} onClick={onSelect}>
      {driving ? (
        <>
          <div className="r1">{candidate.totalTime}분 <span className="mono">{candidate.distanceKm}km</span></div>
          <div className="r2">{candidate.roads.join(" · ")} 경유</div>
        </>
      ) : (
        <>
          <div className="r1">
            {candidate.totalTime}분 <span className="mono">{candidate.lines.join(" · ")}</span>
          </div>
          <div className="r2">
            환승 {candidate.transitCount}회
            {candidate.stationCount ? ` · 정류장 ${candidate.stationCount}개` : ""}
          </div>
        </>
      )}
    </button>
  );
}
