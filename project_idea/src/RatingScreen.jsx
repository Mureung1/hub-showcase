import { useState, useEffect } from "react";
import { API_BASE } from "./apiBase";

function Stars({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="별점" style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          aria-label={`${n}점`}
          onClick={() => onChange(n)}
          style={{
            cursor: "pointer",
            fontSize: 20,
            color: n <= value ? "#C98A1F" : "rgba(36,21,18,0.15)",
            border: "none",
            background: "none",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function RatingScreen({ candidate, onBack, onFinish }) {
  // 동행자별로 별점·노쇼 여부를 따로 관리 ({ [동행자requestId]: 값 })
  const [ratings, setRatings] = useState({});
  const [noshows, setNoshows] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [companions, setCompanions] = useState([]);
  const [loadingCompanions, setLoadingCompanions] = useState(true);

  useEffect(() => {
    if (!candidate?.groupId) {
      setLoadingCompanions(false);
      return;
    }
    fetch(`${API_BASE}/api/requests/group/${candidate.groupId}`)
      .then((res) => res.json())
      .then((members) => {
        setCompanions(members.filter((m) => m.id !== candidate.myRequestId));
      })
      .catch(() => {})
      .finally(() => setLoadingCompanions(false));
  }, [candidate?.groupId, candidate?.myRequestId]);

  function setCompanionRating(id, stars) {
    setRatings((prev) => ({ ...prev, [id]: stars }));
  }

  function toggleNoshow(id, checked) {
    setNoshows((prev) => ({ ...prev, [id]: checked }));
  }

  async function handleSubmit() {
    if (companions.some((c) => !ratings[c.id])) {
      setError("모든 동행자에게 별점을 선택해주세요.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = companions.map((c) => ({
        targetRequestId: c.id,
        stars: ratings[c.id],
        noshow: !!noshows[c.id],
      }));
      const res = await fetch(`${API_BASE}/api/requests/${candidate.myRequestId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: payload }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "저장에 실패했어요.");
        return;
      }
      onFinish();
    } catch {
      setError("저장에 실패했어요. 서버가 켜져 있는지 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ alignSelf: "flex-start", border: "none", background: "none", color: "#8A7A76", fontSize: 13, padding: "14px 0", cursor: "pointer" }}
        >
          ‹ 이전
        </button>
      )}
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "14px 0 20px" }}>이동이 끝났어요</h1>

      {loadingCompanions ? (
        <p style={{ fontSize: 12, color: "#8A7A76", margin: "0 0 12px" }}>동행자 정보를 불러오는 중...</p>
      ) : companions.length === 0 ? (
        <p style={{ fontSize: 13, color: "#8A7A76", margin: "0 0 20px" }}>평가할 동행자가 없어요.</p>
      ) : (
        companions.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#fff",
              border: "1px solid rgba(36,21,18,0.08)",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{c.profile?.name ?? "동행 학생"}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: c.profile?.ratingCount ? "#C98A1F" : "#2F8F5B" }}>
                {c.profile?.ratingCount ? `★ ${c.profile.rating.toFixed(1)}` : "NEW"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Stars value={ratings[c.id] ?? 0} onChange={(v) => setCompanionRating(c.id, v)} />
              <label style={{ fontSize: 12, color: "#8A7A76", display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!noshows[c.id]}
                  onChange={(e) => toggleNoshow(c.id, e.target.checked)}
                />
                노쇼 신고하기
              </label>
            </div>
          </div>
        ))
      )}

      {error && (
        <p style={{ fontSize: 12, color: "#C8102E", margin: "0 0 8px", textAlign: "center" }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="btn-primary"
        style={{
          width: "100%",
          padding: 15,
          background: "#C8102E",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.7 : 1,
          marginTop: "auto",
        }}
      >
        {saving ? "저장 중..." : "완료"}
      </button>
    </div>
  );
}

export default RatingScreen;
