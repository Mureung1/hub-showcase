// API 호출의 기준 주소. 웹(같은 오리진에서 프론트+API가 함께 서빙됨)에서는 비워두고 상대경로(/api/...)를
// 그대로 쓰고, Capacitor 안드로이드 앱처럼 프론트가 배포 서버와 다른 오리진(capacitor://localhost 등)에서
// 로드되는 경우에는 배포된 백엔드 절대주소를 넣어야 /api 호출이 그 서버로 나간다.
//
// 값은 빌드 시점 환경변수 VITE_API_BASE_URL로 주입한다. 웹 배포(Render/Vercel)에서는 설정하지 않아
// 빈 문자열('') → 상대경로 유지. 앱 빌드 시에만 `VITE_API_BASE_URL=https://<배포주소>`로 빌드한다.
// (docs/03-개발스펙/apk-build-guide.md 참고.) 끝의 슬래시는 제거해 `${API_BASE}/api/...`가 이중 슬래시가 되지 않게 한다.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
