// API 서버 주소를 한 곳에서 정한다.
//
// 로컬 개발: 값을 비워두면 같은 오리진의 "/api/..." 로 요청하고, Vite 프록시가
//   localhost:3001 로 넘겨준다(vite.config.js).
// 배포: FE(Vercel)와 BE(Render)가 서로 다른 주소라서 프록시가 없다.
//   Vercel 환경변수 VITE_API_BASE_URL 에 Render 주소를 넣으면 그쪽으로 직접 요청한다.
//   예) VITE_API_BASE_URL=https://exam-priority-server.onrender.com
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

// 끝의 "/" 를 지워 apiUrl("/api/subjects") 이 "//api" 가 되지 않게 한다.
export const API_BASE_URL = rawBaseUrl.trim().replace(/\/+$/, "");

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
