// 로컬 개발은 Vite 프록시가 /api/*를 3001번으로 넘겨주므로 상대경로만으로 충분하지만,
// 배포 환경(FE: Vercel, BE: Render)은 서로 다른 도메인이라 BE 절대주소가 필요하다.
// VITE_API_BASE_URL이 없으면(로컬) 기존처럼 상대경로 그대로 동작한다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}
