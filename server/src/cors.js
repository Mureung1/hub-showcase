// 교차 출처 요청 허용 (Phase 23-2).
//
// React 는 Vercel, Express 는 Render 로 서로 다른 출처에 뜬다. 개발 중에는
// product/vite.config.js 의 `/api` 프록시가 같은 출처로 보이게 가려 주지만,
// 배포에서는 브라우저가 응답의 `Access-Control-Allow-Origin` 을 보고 막는다.
//
// `cors` npm 패키지를 넣지 않고 직접 구현한다. 필요한 규칙이 네 줄이고, Express 의
// 의존성을 셋으로 유지하는 편이 배포 표면이 작다.
//
// 허용 목록은 코드가 아니라 환경변수 `ALLOWED_ORIGINS` 가 정한다. 주소는 환경마다
// 다르므로 저장소에는 이름만 두고 값은 배포 플랫폼에서 넣는다.

// 값이 비었을 때 쓰는 개발 기본값. Vite 개발 서버의 두 주소만 연다.
// `*` 를 기본값으로 두지 않는다. 값을 넣지 않은 배포가 곧바로 전체 공개가 된다.
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

// 프리플라이트 응답. 화면이 쓰는 메서드와 헤더만 연다.
// 쿠키를 쓰지 않으므로 `Access-Control-Allow-Credentials` 는 두지 않는다.
const ALLOWED_METHODS = 'GET, POST, OPTIONS'
const ALLOWED_HEADERS = 'Content-Type'
const MAX_AGE_SECONDS = '86400'

/**
 * 허용 출처 목록을 만든다.
 *
 * 입력은 쉼표로 구분한 문자열이거나 배열이다. 공백과 빈 항목은 버리고, 끝의 `/` 는
 * 떼어 낸다. 브라우저가 보내는 `Origin` 헤더에는 경로도 끝 슬래시도 없어서,
 * 환경변수에 `https://example.com/` 로 적히면 그대로는 영원히 어긋난다.
 *
 * 남는 항목이 없으면 개발 기본값을 낸다.
 */
function resolveAllowedOrigins(raw) {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(',')
  const list = parts.map((item) => String(item).trim().replace(/\/+$/, '')).filter(Boolean)
  return list.length > 0 ? list : [...DEFAULT_ORIGINS]
}

/**
 * CORS 미들웨어를 만든다.
 *
 * 허용 목록에 없는 출처는 `Access-Control-Allow-Origin` 을 붙이지 않고 그대로 통과시킨다.
 * 거부는 브라우저가 한다. 서버가 500 이나 403 으로 끊으면 curl·헬스체크처럼 `Origin`
 * 이 없는 정상 호출까지 함께 죽는다.
 */
function createCors(options = {}) {
  const allowed = new Set(
    resolveAllowedOrigins(options.allowedOrigins ?? process.env.ALLOWED_ORIGINS)
  )

  return function cors(req, res, next) {
    // 응답이 `Origin` 에 따라 달라진다는 표시. 이것이 없으면 중간 캐시가 한 출처에
    // 준 응답을 다른 출처에 그대로 되돌려 허용 여부가 뒤바뀐다.
    res.vary('Origin')

    const origin = req.headers.origin
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }

    // 프리플라이트는 본문 없이 끝낸다. 라우트까지 내려보내지 않는다.
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
      res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
      res.setHeader('Access-Control-Max-Age', MAX_AGE_SECONDS)
      return res.status(204).end()
    }

    return next()
  }
}

module.exports = {
  createCors,
  resolveAllowedOrigins,
  DEFAULT_ORIGINS,
  ALLOWED_METHODS,
  ALLOWED_HEADERS,
}
