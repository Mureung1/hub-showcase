import { useState, useEffect } from "react";

const API_BASE = import.meta.env.PROD ? "" : "http://localhost:8000";

const GREEN = "#03C75A";
const BG_PAGE = "#0D0F0E";
const BG_CARD = "#1A1D1B";
const BORDER = "#2A2E2B";
const TEXT_SECONDARY = "#9CA3AF";
const TEXT_MUTED = "#6B7280";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStores = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/my-stores`);
      const data = await res.json();
      setStores(data.stores);
    } catch (e) {
      console.error("목록 조회 실패:", e);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/my-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      setName("");
      await loadStores();
    } catch (e) {
      console.error("저장 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG_PAGE, color: "#fff", fontFamily: "'Pretendard', sans-serif" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');`}</style>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px" }}>
        <p style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: "0.15em", margin: "0 0 6px" }}>
          AI MYSTERY SHOPPER
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>내 가게 등록</h1>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="내 가게 이름 입력"
            style={{ flex: 1, backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none" }}
          />
          <button onClick={handleSave} disabled={loading}
            style={{ backgroundColor: GREEN, color: "#04342C", fontSize: 13, fontWeight: 700, padding: "12px 20px", borderRadius: 999, border: "none", cursor: "pointer" }}>
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "28px 0 12px" }}>
          저장된 가게 {stores.length}곳 (새로고침해도 유지됩니다)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stores.map((s) => (
            <div key={s.id} style={{ backgroundColor: BG_CARD, borderRadius: 12, padding: "14px 16px", border: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{s.name}</span>
              <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>#{s.id}</span>
            </div>
          ))}
          {stores.length === 0 && (
            <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", padding: "20px 0" }}>
              아직 저장된 가게가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}