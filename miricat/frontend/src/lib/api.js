// API 주소 조립. 개발에선 VITE_API_BASE가 없어서 상대경로("/api/...") 그대로 → Vite 프록시가 :8000으로 넘겨준다.
// 배포(Vercel)에선 VITE_API_BASE=https://<render-backend> 를 설정 → 절대주소로 백엔드 직행.
// import.meta.env.VITE_* 는 Vite가 "빌드 시점"에 문자열로 박아넣는 값 — 배포 후 바꾸려면 재빌드 필요.
export function api(path) {
  return (import.meta.env.VITE_API_BASE ?? "") + path;
}
