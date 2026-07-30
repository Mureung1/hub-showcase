// 배포 경로가 둘이라 보안 헤더도 두 군데에 있어야 한다:
//
//   - Render / 로컬 프로덕션: server/proxy.js가 정적 파일까지 직접 서빙하므로 이 값을 미들웨어로 붙인다.
//   - Vercel: 정적 파일(HTML/JS/CSS)은 CDN이 직접 내보내고 /api만 서버리스 함수로 온다. 즉 화면을
//     받는 요청은 proxy.js를 **거치지 않는다** — vercel.json의 headers 블록이 필요한 이유다.
//
// 한쪽만 고치면 그 배포만 조용히 무방비가 되고, 두 파일이 멀리 떨어져 있어 눈으로는 안 잡힌다.
// 그래서 값을 여기 한 곳에 두고 securityHeaders.test.js가 vercel.json과 대조한다.
//
// ⚠️ 전체 CSP(script-src/style-src…)는 일부러 넣지 않았다. 이 앱은 네이버 지도 SDK를 외부에서
// 로드하고 스타일이 전부 인라인 객체라, 잘못 좁히면 **배포되는 순간 전 사용자가 흰 화면**을 보고
// 서버 URL 방식이라 이미 설치된 APK까지 같이 죽는다(웹 배포 = 앱 업데이트). 대신 frame-ancestors
// 하나만 담은 CSP를 쓴다 — 지시자가 그것뿐이라 나머지 리소스는 아무것도 제한하지 않으므로 깨질
// 여지가 없으면서 클릭재킹은 막는다. frame-ancestors는 <meta>로 설정할 수 없어 헤더여야 한다.
//
// HSTS는 Vercel이 자동으로 붙이므로(확인함: max-age=63072000; includeSubDomains; preload) 여기서
// 중복으로 설정하지 않는다. Render로 되돌린다면 그때는 직접 넣어야 한다.
//
// Permissions-Policy도 넣지 않았다. 카메라·위치를 실제로 쓰는 앱이라 잘못 적으면 그 기능이 통째로
// 막히는데, 헤더가 없을 때의 기본값이 이미 "동일 출처만 허용"이라 얻는 것보다 잃을 게 크다.
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "frame-ancestors 'self'",
}
