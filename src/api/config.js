// 배포 환경에서 프론트/백엔드가 다른 origin에 있을 때 VITE_API_BASE_URL로 완전한 URL을 만든다.
// 로컬 개발(값 미설정)에서는 상대 경로를 그대로 반환해 Vite 프록시(vite.config.js)에 의존한다.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export function apiUrl(path) {
  return `${BASE_URL}${path}`
}
