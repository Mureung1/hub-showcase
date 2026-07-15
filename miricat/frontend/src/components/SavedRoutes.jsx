// 저장된 경로 목록 화면 — 부모(App)가 준 routes를 렌더만 한다 (presentational).
export default function SavedRoutes({ routes, onRefresh }) {
  // 🗑️ 클릭 시: 해당 id 경로를 DELETE 하고 목록 갱신.
  async function handleDelete(id) {
    await fetch(`/api/routes/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="saved-routes" style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>등록된 경로 ({routes.length})</h2>
        <button onClick={onRefresh}>새로고침</button>
      </div>
      {routes.length === 0 ? (
        <p style={{ color: "#8B7863" }}>아직 등록된 경로가 없어요.</p>
      ) : (
        <ul>
          {routes.map((route) => (
            <li key={route.id}>
              <b>{route.name}</b>
              {route.depart_time ? ` · ${route.depart_time}` : ""}
              <button onClick={() => handleDelete(route.id)}>🗑️</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
