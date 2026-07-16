import { useMemo, useState } from "react";
import { campusSpots, meetingSpots } from "../data/mockData";

function PickupPage({ onNavigate }) {
  const [selectedIds, setSelectedIds] = useState(["dorm1", "engineering"]);
  const selected = campusSpots.filter((spot) => selectedIds.includes(spot.id));
  const ranked = useMemo(() => {
    if (selected.length < 2) return [];
    const center = selected.reduce((point, spot) => ({ x: point.x + spot.x / selected.length, y: point.y + spot.y / selected.length }), { x: 0, y: 0 });
    return meetingSpots.map((spot) => ({ ...spot, score: Math.round(selected.reduce((sum, start) => sum + Math.hypot(start.x - spot.x, start.y - spot.y), 0) / selected.length), centerDistance: Math.hypot(center.x - spot.x, center.y - spot.y) })).sort((a, b) => a.score - b.score || a.centerDistance - b.centerDistance).slice(0, 3);
  }, [selected]);

  function toggle(spot) { setSelectedIds((ids) => ids.includes(spot.id) ? ids.filter((id) => id !== spot.id) : [...ids, spot.id]); }
  function apply(place) { sessionStorage.setItem("campus-cart-pickup", place.name); onNavigate("/group-buys"); }

  return <main className="workspace pickup-workspace"><section className="pickup-hero"><div><span className="kicker">MEETING POINT FINDER</span><h1>우리 모두에게<br />가까운 곳을 찾아요.</h1><p>각 참여자의 출발 위치를 선택하면 이동 거리의 중심을 계산해 공동 수령 장소를 추천합니다.</p></div><div className="finder-summary"><span>현재 참여 위치</span><strong>{selected.length}곳</strong><div>{selected.map((spot) => <b key={spot.id}>{spot.name}</b>)}</div></div></section><section className="finder-layout"><div className="start-panel"><div className="finder-title"><span>STEP 1</span><h2>참여자 출발 위치</h2><p>두 곳 이상 선택해 주세요. 참여자가 늘면 위치를 추가할 수 있어요.</p></div><div className="campus-map">{campusSpots.map((spot) => <button className={selectedIds.includes(spot.id) ? "selected" : ""} style={{ left: `${spot.x}%`, top: `${spot.y}%` }} type="button" key={spot.id} onClick={() => toggle(spot)}><i />{spot.name}</button>)}<div className="map-road road-a" /><div className="map-road road-b" /><span className="map-label">CAMPUS MAP</span></div><div className="location-chips">{campusSpots.map((spot) => <button className={selectedIds.includes(spot.id) ? "active" : ""} type="button" key={spot.id} onClick={() => toggle(spot)}>{selectedIds.includes(spot.id) ? "✓ " : "+ "}{spot.name}</button>)}</div></div><div className="result-panel"><div className="finder-title"><span>STEP 2</span><h2>추천 공동 수령지</h2><p>선택한 위치들의 평균 이동 거리가 짧은 순서예요.</p></div>{ranked.length < 1 ? <div className="finder-empty">출발 위치를 두 곳 이상 선택해 주세요.</div> : <div className="ranked-list">{ranked.map((place, index) => <article className={index === 0 ? "best" : ""} key={place.id}><div className="rank-number">0{index + 1}</div><div><span>{index === 0 ? "가장 공평한 장소" : place.indoor ? "실내 수령 가능" : "야외 만남 장소"}</span><h3>{place.name}</h3><p>{place.note}</p><small>평균 이동 점수 {place.score} · {place.indoor ? "실내" : "야외"}</small></div><button type="button" onClick={() => apply(place)}>이 장소 선택</button></article>)}</div>}<div className="finder-info"><strong>어떻게 계산하나요?</strong><p>각 출발지와 후보 장소 사이의 거리를 비교하고, 모두의 평균 이동 거리가 가장 짧은 장소를 먼저 보여줍니다.</p></div></div></section></main>;
}

export default PickupPage;
