import { useEffect, useState } from "react";

// Spring 서버 기본 포트는 8080
const API = "http://localhost:8080/api";
const USER_ID = 1; // 로그인 붙기 전 임시 (숫자 — users.id)

const SAMPLE_POSTINGS = [
  { postingId: 1, title: "백엔드 엔지니어", company: "샘플컴퍼니A" },
  { postingId: 2, title: "풀스택 개발자", company: "샘플컴퍼니B" },
  { postingId: 3, title: "플랫폼 엔지니어", company: "샘플컴퍼니C" },
];

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBookmarks() {
    try {
      setError("");
      const res = await fetch(`${API}/bookmarks?userId=${USER_ID}`);
      if (!res.ok) throw new Error("불러오기 실패");
      setBookmarks(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBookmarks(); }, []);

  async function addBookmark(posting) {
    try {
      setError("");
      const res = await fetch(`${API}/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Spring은 userId, postingId만 받는다 (title/company는 서버가 조인해 채움)
        body: JSON.stringify({ userId: USER_ID, postingId: posting.postingId }),
      });
      if (res.status === 409) throw new Error("이미 저장한 공고입니다.");
      if (!res.ok) throw new Error("저장 실패");
      // POST 응답엔 조인된 title이 없으므로, 목록을 다시 불러와 최신 상태로 맞춘다
      await loadBookmarks();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeBookmark(id) {
    try {
      setError("");
      const res = await fetch(`${API}/bookmarks/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("삭제 실패");
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  const savedIds = new Set(bookmarks.map((b) => b.postingId));

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>관심 공고</h2>
      {error && <p style={S.error}>{error}</p>}

      <section>
        <h3 style={S.h3}>공고 목록</h3>
        {SAMPLE_POSTINGS.map((p) => (
          <div key={p.postingId} style={S.row}>
            <span><b>{p.title}</b> · {p.company}</span>
            <button
              style={savedIds.has(p.postingId) ? S.btnSaved : S.btn}
              disabled={savedIds.has(p.postingId)}
              onClick={() => addBookmark(p)}
            >
              {savedIds.has(p.postingId) ? "저장됨" : "저장"}
            </button>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={S.h3}>저장한 공고 ({bookmarks.length})</h3>
        {loading ? (
          <p style={S.muted}>불러오는 중…</p>
        ) : bookmarks.length === 0 ? (
          <p style={S.muted}>아직 저장한 공고가 없습니다.</p>
        ) : (
          bookmarks.map((b) => (
            <div key={b.id} style={S.row}>
              <span><b>{b.title}</b> · {b.company}</span>
              <button style={S.btnDel} onClick={() => removeBookmark(b.id)}>삭제</button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

const S = {
  wrap: { maxWidth: 560, margin: "40px auto", fontFamily: "sans-serif", color: "#1a1d24" },
  h2: { fontSize: 24, marginBottom: 16 },
  h3: { fontSize: 14, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8 },
  btn: { padding: "7px 16px", border: "none", borderRadius: 8, background: "#8b7cf6", color: "#fff", cursor: "pointer", fontWeight: 600 },
  btnSaved: { padding: "7px 16px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f3f4f6", color: "#9ca3af", cursor: "default" },
  btnDel: { padding: "7px 16px", border: "1px solid #ef4444", borderRadius: 8, background: "#fff", color: "#ef4444", cursor: "pointer" },
  error: { color: "#ef4444", background: "#fef2f2", padding: "10px 14px", borderRadius: 8 },
  muted: { color: "#9ca3af" },
};
