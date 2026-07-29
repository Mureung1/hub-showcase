import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import corsModule from './cors.js'
import server from './index.js'

const { createCors, resolveAllowedOrigins, DEFAULT_ORIGINS } = corsModule
const { createApp } = server

const VERCEL = 'https://careersignal.vercel.app'
const OTHER = 'https://attacker.example'

// 앱을 실제 포트에 올리고 fetch 로 부른다. index.test.js 와 같은 방식이다.
// CORS 는 라우트보다 앞이므로 데이터베이스 조회 함수는 필요 없다.
function startApp(options = {}) {
  const app = createApp({ db: { getJobRoles: async () => [] }, ...options })
  return new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => {
      const { port } = listener.address()
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => listener.close(done)),
      })
    })
  })
}

// ---- 허용 목록 해석 -------------------------------------------------------

describe('허용 출처 목록', () => {
  test('쉼표로 구분한 목록을 나누고 공백을 버린다', () => {
    expect(resolveAllowedOrigins(` ${VERCEL} , ${OTHER} `)).toEqual([VERCEL, OTHER])
  })

  test('끝의 슬래시를 뗀다. Origin 헤더에는 슬래시가 없다', () => {
    expect(resolveAllowedOrigins(`${VERCEL}/`)).toEqual([VERCEL])
  })

  test('비어 있으면 개발 기본값 두 개만 낸다. `*` 가 아니다', () => {
    expect(resolveAllowedOrigins('')).toEqual(DEFAULT_ORIGINS)
    expect(resolveAllowedOrigins(undefined)).toEqual(DEFAULT_ORIGINS)
    expect(resolveAllowedOrigins(' , ')).toEqual(DEFAULT_ORIGINS)
    expect(resolveAllowedOrigins('')).not.toContain('*')
  })

  test('배열도 받는다', () => {
    expect(resolveAllowedOrigins([VERCEL, ''])).toEqual([VERCEL])
  })
})

// ---- 허용·비허용 ----------------------------------------------------------

describe('허용 출처 판정', () => {
  let app

  beforeAll(async () => {
    app = await startApp({ allowedOrigins: `${VERCEL}` })
  })
  afterAll(async () => {
    await app.close()
  })

  test('허용 목록의 출처에는 그 출처를 그대로 되돌린다', async () => {
    const response = await fetch(`${app.base}/api/health`, { headers: { Origin: VERCEL } })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(VERCEL)
  })

  test('허용 목록에 없는 출처에는 헤더를 붙이지 않는다. 응답은 살아 있다', async () => {
    const response = await fetch(`${app.base}/api/health`, { headers: { Origin: OTHER } })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(null)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  test('Origin 이 없는 요청(curl·헬스체크)도 그대로 통과한다', async () => {
    const response = await fetch(`${app.base}/api/health`)
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(null)
  })

  test('쿠키를 쓰지 않으므로 credentials 헤더는 없다', async () => {
    const response = await fetch(`${app.base}/api/health`, { headers: { Origin: VERCEL } })
    expect(response.headers.get('access-control-allow-credentials')).toBe(null)
  })

  test('응답은 출처마다 갈리므로 Vary: Origin 이 붙는다', async () => {
    const allowed = await fetch(`${app.base}/api/health`, { headers: { Origin: VERCEL } })
    const denied = await fetch(`${app.base}/api/health`, { headers: { Origin: OTHER } })
    expect(allowed.headers.get('vary')).toContain('Origin')
    expect(denied.headers.get('vary')).toContain('Origin')
  })
})

// ---- 프리플라이트 ---------------------------------------------------------

describe('OPTIONS 프리플라이트', () => {
  let app

  beforeAll(async () => {
    app = await startApp({ allowedOrigins: VERCEL })
  })
  afterAll(async () => {
    await app.close()
  })

  test('204 와 허용 메서드·헤더로 답한다', async () => {
    const response = await fetch(`${app.base}/api/reverse`, {
      method: 'OPTIONS',
      headers: {
        Origin: VERCEL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(VERCEL)
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS')
    expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type')
    expect(await response.text()).toBe('')
  })

  test('허용 목록에 없는 출처의 프리플라이트도 204 다. 다만 허용 헤더가 없다', async () => {
    const response = await fetch(`${app.base}/api/reverse`, {
      method: 'OPTIONS',
      headers: { Origin: OTHER, 'Access-Control-Request-Method': 'POST' },
    })
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(null)
  })
})

// ---- 기본값 ---------------------------------------------------------------

describe('환경변수가 비었을 때의 기본값', () => {
  let app

  beforeAll(async () => {
    app = await startApp({ allowedOrigins: '' })
  })
  afterAll(async () => {
    await app.close()
  })

  test('Vite 개발 서버 두 주소를 허용한다', async () => {
    for (const origin of DEFAULT_ORIGINS) {
      const response = await fetch(`${app.base}/api/health`, { headers: { Origin: origin } })
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    }
  })

  test('그 밖의 출처는 허용하지 않는다. 전체 공개로 떨어지지 않는다', async () => {
    const response = await fetch(`${app.base}/api/health`, { headers: { Origin: VERCEL } })
    expect(response.headers.get('access-control-allow-origin')).toBe(null)
  })
})

// ---- 미들웨어 단위 --------------------------------------------------------

describe('미들웨어 조립', () => {
  test('환경변수 ALLOWED_ORIGINS 를 읽는다', () => {
    const previous = process.env.ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = `${VERCEL}, https://preview.vercel.app`
    try {
      const middleware = createCors()
      const headers = {}
      const res = {
        vary: () => {},
        setHeader: (key, value) => {
          headers[key] = value
        },
      }
      let passed = false
      middleware({ method: 'GET', headers: { origin: VERCEL } }, res, () => {
        passed = true
      })
      expect(headers['Access-Control-Allow-Origin']).toBe(VERCEL)
      expect(passed).toBe(true)
    } finally {
      if (previous === undefined) delete process.env.ALLOWED_ORIGINS
      else process.env.ALLOWED_ORIGINS = previous
    }
  })
})
