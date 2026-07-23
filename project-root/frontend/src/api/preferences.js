// api/preferences.js
// 백엔드 POST /api/preferences/parse 호출 래퍼. 자유 텍스트를 조건 객체(JSON)로 변환한다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function parseFreeTextConditions(freeText) {
  const res = await fetch(`${API_BASE_URL}/api/preferences/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ freeText }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `조건 분석 실패 (${res.status})`);
  }
  return res.json();
}
