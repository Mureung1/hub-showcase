import { useState, useEffect } from "react";
import RouteRegister from "./components/RouteRegister";
import SavedRoutes from "./components/SavedRoutes";
import Miricat from "./components/Miricat";

export default function App() {
  // 두 화면이 공유하는 경로 목록 — 공통 부모(App)가 소유한다 (상태 끌어올리기).
  const [routes, setRoutes] = useState([]);

  async function loadRoutes() {
    const res = await fetch("/api/routes");
    const data = await res.json();
    setRoutes(data.routes ?? []);
  }

  useEffect(() => {
    loadRoutes();
  }, []); // 처음 한 번 로드

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 24px" }}>
      <div className="brand">
        <span className="brand-badge"><Miricat size={42} /></span>
        <h1>미리캣</h1>
      </div>
      <RouteRegister onSaved={loadRoutes} />
      <SavedRoutes routes={routes} onRefresh={loadRoutes} />
    </div>
  );
}
