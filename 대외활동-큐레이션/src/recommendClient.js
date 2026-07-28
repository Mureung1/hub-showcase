// 자연어 추천 API 호출. 프론트는 Gemini 키를 못 들고(공개되면 유출) 서버가 대신 부른다.
// 배포(Vercel)는 같은 도메인의 서버리스 함수 /api/recommend, 로컬 개발은 server/api-server.js(8787).
// import.meta.env.DEV로 자동 구분하고, 필요하면 VITE_RECOMMEND_API로 덮어쓴다.
const API = import.meta.env.VITE_RECOMMEND_API || (import.meta.env.DEV ? "http://localhost:8787/api/recommend" : "/api/recommend");

export async function fetchRecommendations(prompt) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `추천 요청 실패 (${res.status})`);
  }
  return res.json(); // { profile, candidateCount, results: [{id, reason}] }
}
