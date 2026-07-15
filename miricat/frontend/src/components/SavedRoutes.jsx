import { useState, useEffect } from "react";

// 저장된 경로 목록 화면 — GET /api/routes 로 받아와 렌더.
export default function SavedRoutes() {
  const [routes, setRoutes] = useState([]);

  // 백엔드에서 목록을 받아 state에 넣는 함수 (재사용: 처음 로드 + 새로고침 버튼)
  async function load() {
    const res = await fetch("/api/routes");
    const data = await res.json();
    setRoutes(data.routes ?? []);
  }

  // 화면이 처음 뜰 때 딱 한 번 목록을 불러온다.
  useEffect(() => {
    load();
  }, []); // [] = "처음 한 번만"

  return (
    <div className="saved-routes" style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>등록된 경로 ({routes.length})</h2>
        <button onClick={load}>새로고침</button>
      </div>
      {routes.length === 0 ? (
        <p style={{ color: "#8B7863" }}>아직 등록된 경로가 없어요.</p>
      ) : (
        <ul>
          {routes.map((route) => (
            <li key={route.id}>
              <b>{route.name}</b>
              {route.depart_time ? ` · ${route.depart_time}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
