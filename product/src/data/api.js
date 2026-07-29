// API 주소를 만드는 유일한 자리 (Phase 23-2).
//
// React 는 Vercel, Express 는 Render 로 서로 다른 출처에 뜬다. 개발 중에는
// vite.config.js 의 `/api` 프록시가 상대경로를 4000 번 포트로 넘겨 주지만, Vercel 은
// 그 경로에 아무것도 없어 404 를 낸다. 그래서 화면이 부르는 모든 경로가 이 함수를 거친다.
//
// 값은 빌드 시점에 코드로 박힌다(Vite 의 `import.meta.env` 치환). 주소를 바꾸면
// 다시 빌드해야 하며, 런타임에 갈아 끼울 수 없다.

// 끝의 `/` 를 떼어 둔다. 대시보드에 `https://example.com/` 로 적혀도 `//api/...` 가 되지 않는다.
const API_BASE = String(import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '')

/**
 * `/api/...` 경로 앞에 API 서버 주소를 붙인다.
 *
 * 값이 비면 경로를 그대로 낸다. 개발에서는 Vite 프록시가, 같은 출처 배포에서는
 * 그 출처가 받는다. 값이 있으면 `https://호스트/api/...` 가 된다.
 */
export function apiUrl(path) {
  const suffix = String(path ?? '')
  if (!API_BASE) return suffix
  return `${API_BASE}/${suffix.replace(/^\/+/, '')}`
}

export { API_BASE }
