import { api } from "../lib/api";
import { useState, useEffect } from "react";
import RouteRegister from "../components/RouteRegister";
import SavedRoutes from "../components/SavedRoutes";
import NoticesPanel from "../components/NoticesPanel";

// 홈 화면: 경로 등록 → 등록 목록 → 공지 대조. (원래 App.jsx 본문이 통째로 이사 왔다)
export default function HomePage() {
  // 두 화면이 공유하는 경로 목록 — 공통 부모(HomePage)가 소유한다 (상태 끌어올리기).
  const [routes, setRoutes] = useState([]);

  async function loadRoutes() {
    const res = await fetch(api("/api/routes"));
    const data = await res.json();
    setRoutes(data.routes ?? []);
  }

  useEffect(() => {
    loadRoutes();
  }, []); // 처음 한 번 로드

  return (
    <>
      <RouteRegister onSaved={loadRoutes} />
      <SavedRoutes routes={routes} onRefresh={loadRoutes} />
      <NoticesPanel routes={routes} />
    </>
  );
}
